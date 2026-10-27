import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RentalStatus, PlotterStatus } from '@prisma/client';
import { getStartOfDayKst, getNowKst } from '../common/utils/date.util';
import {
  CleanupDatabaseDto,
  DEFAULT_RETENTION_DAYS,
} from './dto/cleanup-database.dto';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const today = getStartOfDayKst();
    
    const [
      totalUsers,
      totalRentals,
      activeRentals,
      overdueRentals,
      plotterPending,
      plotterConfirmed,
      plotterPrinted,
    ] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.rental.count({ where: { deletedAt: null } }),
      this.prisma.rental.count({
        where: {
          rentalItems: { some: { status: RentalStatus.RENTED } },
          deletedAt: null,
        },
      }),
      this.prisma.rental.count({
        where: {
          rentalItems: { some: { status: RentalStatus.RENTED } },
          endDate: { lt: today },
          deletedAt: null,
        },
      }),
      this.prisma.plotterOrder.count({
        where: { status: PlotterStatus.PENDING, deletedAt: null },
      }),
      this.prisma.plotterOrder.count({
        where: { status: PlotterStatus.CONFIRMED, deletedAt: null },
      }),
      this.prisma.plotterOrder.count({
        where: { status: PlotterStatus.PRINTED, deletedAt: null },
      }),
    ]);

    const mostRentedItems = await this.prisma.item.findMany({
      where: { deletedAt: null },
      orderBy: { rentalCount: 'desc' },
      take: 5,
      select: { id: true, name: true, rentalCount: true, itemCode: true },
    });

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    const recentRentalsTrend = await this.prisma.rental.groupBy({
      by: ['startDate'],
      where: {
        startDate: { gte: sevenDaysAgo },
        deletedAt: null,
      },
      _count: { id: true },
      orderBy: { startDate: 'asc' },
    });

    const plotterStats = await this.prisma.plotterOrder.aggregate({
      where: { 
        status: { in: [PlotterStatus.PRINTED, PlotterStatus.COMPLETED] },
        deletedAt: null 
      },
      _sum: {
        price: true,
        pageCount: true,
      },
    });

    return {
      summary: {
        totalUsers,
        totalRentals,
        activeRentals,
        overdueRentals,
        plotterOrders: {
          pending: plotterPending,
          confirmed: plotterConfirmed,
          printed: plotterPrinted,
        },
      },
      mostRentedItems,
      trends: {
        rentals: recentRentalsTrend.map(t => ({
          date: t.startDate.toISOString().split('T')[0],
          count: t._count.id,
        })),
      },
      plotterAccumulated: {
        totalRevenue: plotterStats._sum.price || 0,
        totalPageCount: plotterStats._sum.pageCount || 0,
      }
    };
  }

  async getNotifications(since?: string) {
    const sinceDate = since ? new Date(since) : new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [rentals, plotterOrders] = await Promise.all([
      this.prisma.rental.findMany({
        where: { createdAt: { gt: sinceDate }, deletedAt: null },
        select: {
          id: true,
          createdAt: true,
          user: { select: { name: true, studentId: true } },
          rentalItems: { select: { item: { select: { name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.plotterOrder.findMany({
        where: { createdAt: { gt: sinceDate }, deletedAt: null },
        select: {
          id: true,
          createdAt: true,
          purpose: true,
          paperSize: true,
          user: { select: { name: true, studentId: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const notifications = [
      ...rentals.map((r) => ({
        type: 'RENTAL' as const,
        id: r.id,
        createdAt: r.createdAt,
        message: `${r.user.name}(${r.user.studentId}) 님이 대여 예약을 신청했습니다.`,
        detail: r.rentalItems.map((ri) => ri.item.name).join(', '),
      })),
      ...plotterOrders.map((p) => ({
        type: 'PLOTTER' as const,
        id: p.id,
        createdAt: p.createdAt,
        message: `${p.user.name}(${p.user.studentId}) 님이 플로터 주문을 신청했습니다.`,
        detail: `${p.purpose} / ${p.paperSize}`,
      })),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return { since: sinceDate, count: notifications.length, notifications };
  }

  // 1. DB 관리 상태 조회
  async getDbMaintenanceStatus() {
    const tables = [
      'user', 'item', 'itemInstance', 'rental', 'plotterOrder', 'auditLog', 'verificationCode'
    ];
    
    const status: any = {};
    
    for (const table of tables) {
      const total = await (this.prisma[table] as any).count();
      const deleted = (this.prisma[table] as any).count && (this.prisma[table] as any).fields?.deletedAt 
        ? await (this.prisma[table] as any).count({ where: { NOT: { deletedAt: null } } })
        : 0;
      
      status[table] = { total, deleted };
    }

    // 테스트 유저 수 (아이디가 testuser_ 또는 lock_ 로 시작하는 경우)
    const testUsers = await this.prisma.user.count({
      where: {
        OR: [
          { username: { startsWith: 'testuser_' } },
          { username: { startsWith: 'lock_' } },
          { username: 'e2eusertest' }
        ]
      }
    });

    // 지금 정밀 청소를 돌리면 실제로 지워질 건수 (기본 보존 기간 기준)
    const cutoff = new Date(
      getNowKst().getTime() - DEFAULT_RETENTION_DAYS * 86400000,
    );
    const [purgeRentals, purgeOrders, purgeItems] = await Promise.all([
      this.prisma.rental.count({ where: { deletedAt: { not: null, lt: cutoff } } }),
      this.prisma.plotterOrder.count({ where: { deletedAt: { not: null, lt: cutoff } } }),
      this.prisma.item.count({ where: { deletedAt: { not: null, lt: cutoff } } }),
    ]);

    return {
      tableStatus: status,
      testUserCount: testUsers,
      purgeEligible: {
        retentionDays: DEFAULT_RETENTION_DAYS,
        cutoff: cutoff.toISOString(),
        rentals: purgeRentals,
        plotterOrders: purgeOrders,
        items: purgeItems,
      },
    };
  }

  // 2. 정밀 데이터 청소
  /**
   * DB 정밀 청소.
   *
   * 영구 삭제는 되돌릴 수 없으므로 **기본값이 미리보기(dryRun)** 입니다.
   * 실제로 지우려면 `dryRun: false`를 명시해야 하고, 소프트 삭제 데이터는
   * 보존 기간(`olderThanDays`)이 지난 것만 대상으로 합니다.
   *
   * 예전에는 소프트 삭제된 대여를 기간 제한 없이 전부 지웠는데,
   * 사용자가 취소한 예약이 소프트 삭제로 쌓이던 시절에는 이 버튼 한 번으로
   * 취소 이력이 통째로 사라질 수 있었습니다. (대여 취소는 2026-10-27부터 소프트 삭제하지 않음)
   */
  async cleanupDatabase(dto: CleanupDatabaseDto, actorId: string) {
    const dryRun = dto.dryRun !== false; // 명시적으로 false를 보내야 실제 삭제
    const retentionDays = dto.olderThanDays ?? DEFAULT_RETENTION_DAYS;
    const cutoff = new Date(getNowKst().getTime() - retentionDays * 86400000);

    const results: string[] = [];
    const planned: Record<string, number> = {};

    // A. 테스트 계정 및 관련 데이터 (Hard Delete)
    if (dto.deleteTestUsers) {
      const testUsers = await this.prisma.user.findMany({
        where: {
          OR: [
            { username: { startsWith: 'testuser_' } },
            { username: { startsWith: 'lock_' } },
            { username: 'e2eusertest' },
          ],
        },
        select: { id: true },
      });
      const ids = testUsers.map((u) => u.id);
      planned.testUsers = ids.length;

      if (ids.length > 0 && !dryRun) {
        // 하위 데이터부터 순차 삭제
        await this.prisma.rentalHistory.deleteMany({ where: { rental: { userId: { in: ids } } } });
        await this.prisma.rentalItem.deleteMany({ where: { rental: { userId: { in: ids } } } });
        await this.prisma.rental.deleteMany({ where: { userId: { in: ids } } });
        await this.prisma.plotterOrderHistory.deleteMany({ where: { order: { userId: { in: ids } } } });
        await this.prisma.plotterOrder.deleteMany({ where: { userId: { in: ids } } });
        await this.prisma.cartItem.deleteMany({ where: { userId: { in: ids } } });
        await this.prisma.auditLog.deleteMany({ where: { userId: { in: ids } } });
        await this.prisma.user.deleteMany({ where: { id: { in: ids } } });
        results.push(`테스트 계정 ${ids.length}명과 관련 데이터를 영구 삭제했습니다.`);
      } else {
        results.push(`[미리보기] 테스트 계정 ${ids.length}명이 삭제 대상입니다.`);
      }
    }

    // B. 소프트 삭제된 데이터 영구 삭제 (보존 기간이 지난 것만)
    if (dto.purgeSoftDeleted) {
      const rentalWhere = { deletedAt: { not: null, lt: cutoff } };
      const rentals = await this.prisma.rental.findMany({
        where: rentalWhere,
        select: { id: true },
      });
      const rentalIds = rentals.map((r) => r.id);

      const orders = await this.prisma.plotterOrder.findMany({
        where: { deletedAt: { not: null, lt: cutoff } },
        select: { id: true },
      });
      const orderIds = orders.map((o) => o.id);

      // 물품은 다른 기록이 참조 중이면 FK 제약으로 삭제할 수 없다 → 건너뛴다
      const softItems = await this.prisma.item.findMany({
        where: { deletedAt: { not: null, lt: cutoff } },
        select: {
          id: true,
          name: true,
          _count: {
            select: {
              rentalItems: true,
              cartItems: true,
              itemInstances: true,
              itemImages: true,
              components: true,
              isPartOf: true,
            },
          },
        },
      });
      const freeItems = softItems.filter((i) =>
        Object.values(i._count).every((c) => c === 0),
      );
      const blockedItems = softItems.filter((i) =>
        Object.values(i._count).some((c) => c > 0),
      );

      planned.rentals = rentalIds.length;
      planned.plotterOrders = orderIds.length;
      planned.items = freeItems.length;
      planned.itemsBlocked = blockedItems.length;

      if (!dryRun) {
        if (rentalIds.length > 0) {
          await this.prisma.rentalHistory.deleteMany({ where: { rentalId: { in: rentalIds } } });
          await this.prisma.rentalItem.deleteMany({ where: { rentalId: { in: rentalIds } } });
          await this.prisma.rental.deleteMany({ where: { id: { in: rentalIds } } });
        }
        if (orderIds.length > 0) {
          await this.prisma.plotterOrderHistory.deleteMany({ where: { orderId: { in: orderIds } } });
          await this.prisma.plotterOrder.deleteMany({ where: { id: { in: orderIds } } });
        }
        if (freeItems.length > 0) {
          await this.prisma.item.deleteMany({ where: { id: { in: freeItems.map((i) => i.id) } } });
        }
        results.push(
          `영구 삭제 완료 (${retentionDays}일 이전 소프트 삭제분): 대여 ${rentalIds.length}건, 플로터 ${orderIds.length}건, 물품 ${freeItems.length}개`,
        );
      } else {
        results.push(
          `[미리보기] ${retentionDays}일 이전 소프트 삭제분 — 대여 ${rentalIds.length}건, 플로터 ${orderIds.length}건, 물품 ${freeItems.length}개가 삭제 대상입니다.`,
        );
      }

      if (blockedItems.length > 0) {
        results.push(
          `참조 기록이 남아 있어 건너뛴 물품 ${blockedItems.length}개: ${blockedItems.map((i) => i.name).join(', ')}`,
        );
      }
    }

    // C. 물품 대여 횟수 초기화
    if (dto.resetRentalCounts) {
      if (!dryRun) {
        await this.prisma.item.updateMany({ data: { rentalCount: 0 } });
        results.push('모든 물품의 대여 횟수를 0으로 초기화했습니다.');
      } else {
        results.push('[미리보기] 모든 물품의 대여 횟수가 0으로 초기화됩니다.');
      }
    }

    if (results.length === 0) {
      results.push('선택된 작업이 없습니다.');
    }

    // 감사 로그 (미리보기도 남겨 추적 가능하게)
    await this.prisma.auditLog.create({
      data: {
        userId: actorId,
        action: dryRun ? 'DB_MAINTENANCE_PREVIEW' : 'DB_MAINTENANCE_CLEANUP',
        targetType: 'SYSTEM',
        details: { options: { ...dto, dryRun, olderThanDays: retentionDays }, planned, results },
      },
    });

    return {
      message: dryRun
        ? '미리보기입니다. 실제로 삭제하려면 dryRun: false로 다시 요청하세요.'
        : '데이터베이스 정리가 완료되었습니다.',
      dryRun,
      retentionDays,
      cutoff: cutoff.toISOString(),
      planned,
      results,
    };
  }

  async getAuditLogs(page: number = 1, pageSize: number = 20, search?: string, action?: string) {
    const skip = (page - 1) * pageSize;
    const where: any = {};
    if (action) where.action = action;
    if (search) {
      where.OR = [
        { targetId: { contains: search } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [logs, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where, skip, take: pageSize, orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true, username: true } } }
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      pagination: { page, pageSize, totalItems: total, totalPages: Math.ceil(total / pageSize) },
      logs: logs.map(l => ({ ...l, id: l.id.toString() })),
    };
  }
}
