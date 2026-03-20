import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RentalStatus, PlotterStatus } from '@prisma/client';
import { getStartOfDayKst, getNowKst } from '../common/utils/date.util';

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
      this.prisma.rental.count({ where: { status: RentalStatus.RENTED, deletedAt: null } }),
      this.prisma.rental.count({
        where: {
          status: RentalStatus.RENTED,
          endDate: { lt: today },
          deletedAt: null,
        },
      }),
      this.prisma.plotterOrder.count({ where: { status: PlotterStatus.PENDING, deletedAt: null } }),
      this.prisma.plotterOrder.count({ where: { status: PlotterStatus.CONFIRMED, deletedAt: null } }),
      this.prisma.plotterOrder.count({ where: { status: PlotterStatus.PRINTED, deletedAt: null } }),
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

    return { tableStatus: status, testUserCount: testUsers };
  }

  // 2. 정밀 데이터 청소
  async cleanupDatabase(options: { 
    purgeSoftDeleted?: boolean, 
    deleteTestUsers?: boolean, 
    clearAuditLogs?: boolean,
    resetRentalCounts?: boolean 
  }, actorId: string) {
    const results: string[] = [];

    // A. 테스트 유저 및 관련 데이터 삭제 (Hard Delete)
    if (options.deleteTestUsers) {
      const testUsers = await this.prisma.user.findMany({
        where: {
          OR: [
            { username: { startsWith: 'testuser_' } },
            { username: { startsWith: 'lock_' } },
            { username: 'e2eusertest' }
          ]
        },
        select: { id: true }
      });
      const ids = testUsers.map(u => u.id);

      if (ids.length > 0) {
        // 하위 데이터부터 순차 삭제
        await this.prisma.rentalHistory.deleteMany({ where: { rental: { userId: { in: ids } } } });
        await this.prisma.rentalItem.deleteMany({ where: { rental: { userId: { in: ids } } } });
        await this.prisma.rental.deleteMany({ where: { userId: { in: ids } } });
        await this.prisma.plotterOrderHistory.deleteMany({ where: { order: { userId: { in: ids } } } });
        await this.prisma.plotterOrder.deleteMany({ where: { userId: { in: ids } } });
        await this.prisma.cartItem.deleteMany({ where: { userId: { in: ids } } });
        await this.prisma.auditLog.deleteMany({ where: { userId: { in: ids } } });
        await this.prisma.user.deleteMany({ where: { id: { in: ids } } });
        results.push(`${ids.length}명의 테스트 유저와 관련 데이터가 영구 삭제되었습니다.`);
      }
    }

    // B. 소프트 삭제된 데이터 영구 삭제
    if (options.purgeSoftDeleted) {
      await this.prisma.rentalHistory.deleteMany({ where: { rental: { NOT: { deletedAt: null } } } });
      await this.prisma.rentalItem.deleteMany({ where: { rental: { NOT: { deletedAt: null } } } });
      const r = await this.prisma.rental.deleteMany({ where: { NOT: { deletedAt: null } } });
      
      await this.prisma.plotterOrderHistory.deleteMany({ where: { order: { NOT: { deletedAt: null } } } });
      const p = await this.prisma.plotterOrder.deleteMany({ where: { NOT: { deletedAt: null } } });
      
      const i = await this.prisma.item.deleteMany({ where: { NOT: { deletedAt: null } } });
      
      results.push(`영구 삭제 완료: 대여(${r.count}), 플로터(${p.count}), 물품(${i.count})`);
    }

    // C. 물품 대여 횟수 초기화
    if (options.resetRentalCounts) {
      await this.prisma.item.updateMany({ data: { rentalCount: 0 } });
      results.push('모든 물품의 대여 횟수가 0으로 초기화되었습니다.');
    }

    // 감사 로그 기록
    await this.prisma.auditLog.create({
      data: {
        userId: actorId,
        action: 'DB_MAINTENANCE_CLEANUP',
        targetType: 'SYSTEM',
        details: { options, results }
      }
    });

    return { message: '데이터베이스 정리가 완료되었습니다.', results };
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
