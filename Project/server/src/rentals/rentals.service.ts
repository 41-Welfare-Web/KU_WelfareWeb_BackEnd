import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRentalDto, RentalItemDto } from './dto/create-rental.dto';
import { UpdateRentalStatusDto } from './dto/update-rental-status.dto';
import { UpdateRentalDto } from './dto/update-rental.dto';
import { RentalStatus, Role } from '@prisma/client';
import { ConfigurationsService } from '../configurations/configurations.service';
import { HolidaysService } from '../holidays/holidays.service';
import { SmsService } from '../sms/sms.service';
import { CartService } from '../cart/cart.service';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class RentalsService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigurationsService,
    private holidaysService: HolidaysService,
    private smsService: SmsService,
    private cartService: CartService,
  ) {}

  // 1. 대여 예약 생성 (날짜별 그룹핑 → 다중 rental 생성)
  async create(userId: string, createRentalDto: CreateRentalDto, actorId?: string) {
    const { items, departmentType, departmentName } = createRentalDto;
    const actualActorId = actorId || userId;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const maxMonthsStr = await this.configService.getValue(
      'rental_max_period_months',
      '2',
    );
    const maxMonths = parseInt(maxMonthsStr, 10);
    const maxDate = new Date(today);
    maxDate.setMonth(maxDate.getMonth() + maxMonths);

    // 1) 모든 품목 날짜 사전 검증
    for (const item of items) {
      const start = new Date(item.startDate);
      const end = new Date(item.endDate);

      if (start > end) {
        throw new BadRequestException(
          `품목(ID: ${item.itemId}): 종료일이 시작일보다 빠를 수 없습니다.`,
        );
      }
      if (start < today) {
        throw new BadRequestException(
          `품목(ID: ${item.itemId}): 과거 날짜로 예약할 수 없습니다.`,
        );
      }
      if (await this.holidaysService.isHoliday(start)) {
        throw new BadRequestException(
          `품목(ID: ${item.itemId}): 대여 시작일이 휴무일(주말 포함)입니다.`,
        );
      }
      if (await this.holidaysService.isHoliday(end)) {
        throw new BadRequestException(
          `품목(ID: ${item.itemId}): 반납일이 휴무일(주말 포함)입니다.`,
        );
      }
      if (end > maxDate) {
        throw new BadRequestException(
          `품목(ID: ${item.itemId}): 최대 ${maxMonths}개월까지만 예약할 수 있습니다.`,
        );
      }
    }

    // 2) 날짜 기준 그룹핑
    const groups = new Map<string, RentalItemDto[]>();
    for (const item of items) {
      const key = `${item.startDate}__${item.endDate}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(item);
    }

    // 3) 그룹별 rental 생성
    const createdRentals: any[] = [];

    for (const [key, groupItems] of groups) {
      const [startDate, endDate] = key.split('__');
      const start = new Date(startDate);
      const end = new Date(endDate);

      const rental = await this.prisma.$transaction(async (tx) => {
        const finalItemsToRent: { itemId: number; quantity: number }[] = [];

        for (const reqItem of groupItems) {
          const itemWithComponents = await tx.item.findFirst({
            where: { id: reqItem.itemId, deletedAt: null },
            include: { components: true },
          });

          if (!itemWithComponents) {
            throw new NotFoundException(`물품(ID: ${reqItem.itemId})을 찾을 수 없습니다.`);
          }

          finalItemsToRent.push({ itemId: reqItem.itemId, quantity: reqItem.quantity });

          if (itemWithComponents.components.length > 0) {
            for (const component of itemWithComponents.components) {
              finalItemsToRent.push({
                itemId: component.componentId,
                quantity: component.quantity * reqItem.quantity,
              });
            }
          }
        }

        for (const finalItem of finalItemsToRent) {
          const item = await tx.item.findFirst({
            where: { id: finalItem.itemId, deletedAt: null },
          });

          if (!item) {
            throw new NotFoundException(`물품(ID: ${finalItem.itemId})을 찾을 수 없습니다.`);
          }

          const totalQty = item.totalQuantity || 1;

          const overlappingRentals = await tx.rentalItem.findMany({
            where: {
              itemId: finalItem.itemId,
              rental: {
                status: { in: [RentalStatus.RESERVED, RentalStatus.RENTED] },
                deletedAt: null,
                OR: [
                  {
                    startDate: { lte: end },
                    endDate: { gte: start },
                  },
                ],
              },
            },
            select: { quantity: true },
          });

          const reservedQty = overlappingRentals.reduce(
            (sum, r) => sum + r.quantity,
            0,
          );

          if (totalQty - reservedQty < finalItem.quantity) {
            throw new ConflictException(
              `'${item.name}'의 재고가 부족합니다. (남은 수량: ${totalQty - reservedQty})`,
            );
          }
        }

        const created = await tx.rental.create({
          data: {
            userId,
            startDate: start,
            endDate: end,
            departmentType,
            departmentName: departmentName || null,
            status: RentalStatus.RESERVED,
            rentalItems: {
              create: finalItemsToRent.map((i) => ({
                itemId: i.itemId,
                quantity: i.quantity,
              })),
            },
            rentalHistories: {
              create: {
                changedBy: actualActorId,
                newStatus: RentalStatus.RESERVED,
                memo: actorId && actorId !== userId ? '관리자 대리 예약 생성' : '대여 예약 생성',
              },
            },
          },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                name: true,
                studentId: true,
                phoneNumber: true,
                departmentType: true,
                departmentName: true,
                role: true,
                createdAt: true,
              },
            },
            rentalItems: {
              include: { item: true },
            },
          },
        });

        const itemSummary =
          created.rentalItems.length > 0
            ? `${created.rentalItems[0].item.name} 외 ${created.rentalItems.length - 1}건`
            : '물품 없음';

        await this.smsService.sendRentalStatusNotice(
          created.user.phoneNumber,
          created.user.name,
          itemSummary,
          RentalStatus.RESERVED,
        );

        return created;
      });

      createdRentals.push(rental);
    }

    await this.cartService.clearCart(userId);

    return { rentals: createdRentals };
  }

  // 2. 대여 목록 조회
  async findAll(
    userId: string,
    role: Role,
    page: number = 1,
    pageSize: number = 10,
    targetUserId?: string,
    status?: string,
  ) {
    const skip = (page - 1) * pageSize;
    const where: any = { deletedAt: null };

    if (role !== Role.ADMIN) {
      where.userId = userId;
    } else if (targetUserId) {
      where.userId = targetUserId;
    }

    if (status) {
      where.status = status as RentalStatus;
    }

    const [rentals, total] = await this.prisma.$transaction([
      this.prisma.rental.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true, studentId: true, phoneNumber: true, departmentType: true, departmentName: true } },
          rentalItems: { include: { item: { select: { name: true } } } },
        },
      }),
      this.prisma.rental.count({ where }),
    ]);

    return {
      pagination: {
        page,
        pageSize,
        totalItems: total,
        totalPages: Math.ceil(total / pageSize),
      },
      rentals: rentals.map((r) => ({
        ...r,
        itemSummary:
          r.rentalItems.length > 0
            ? `${r.rentalItems[0].item.name} 외 ${r.rentalItems.length - 1}건`
            : '물품 없음',
      })),
    };
  }

  // 3. 대여 상세 조회
  async findOne(id: number, userId: string, role: Role) {
    const rental = await this.prisma.rental.findFirst({
      where: { id, deletedAt: null },
      include: {
        user: { select: { name: true, studentId: true, phoneNumber: true, departmentType: true, departmentName: true } },
        rentalItems: { include: { item: true } },
        rentalHistories: {
          orderBy: { changedAt: 'desc' },
          include: { user: { select: { name: true } } }
        },
      },
    });

    if (!rental) throw new NotFoundException('대여 건을 찾을 수 없습니다.');

    if (role !== Role.ADMIN && rental.userId !== userId) {
      throw new ForbiddenException('접근 권한이 없습니다.');
    }

    return rental;
  }

  // 4. 예약 취소
  async cancel(id: number, userId: string) {
    const rental = await this.prisma.rental.findFirst({
      where: { id, deletedAt: null },
      include: {
        user: true,
        rentalItems: { include: { item: true } },
      },
    });
    if (!rental) throw new NotFoundException('대여 건을 찾을 수 없습니다.');

    if (rental.userId !== userId)
      throw new ForbiddenException('권한이 없습니다.');
    if (rental.status !== RentalStatus.RESERVED) {
      throw new BadRequestException('예약 상태일 때만 취소할 수 있습니다.');
    }

    await this.prisma.rental.update({
      where: { id },
      data: {
        status: RentalStatus.CANCELED,
        rentalHistories: {
          create: {
            changedBy: userId,
            oldStatus: RentalStatus.RESERVED,
            newStatus: RentalStatus.CANCELED,
            memo: '사용자 예약 취소',
          },
        },
      },
    });

    const itemSummary =
      rental.rentalItems.length > 0
        ? `${rental.rentalItems[0].item.name} 외 ${rental.rentalItems.length - 1}건`
        : '물품 없음';

    await this.smsService.sendRentalStatusNotice(
      rental.user.phoneNumber,
      rental.user.name,
      itemSummary,
      RentalStatus.CANCELED,
      '사용자 직접 취소',
    );

    return { message: '예약이 취소되었습니다.' };
  }

  // 5. 대여 상태 변경
  async updateStatus(
    id: number,
    userId: string,
    updateDto: UpdateRentalStatusDto,
  ) {
    const { status: newStatus, memo } = updateDto;

    const rental = await this.prisma.rental.findFirst({
      where: { id, deletedAt: null },
      include: {
        user: true,
        rentalItems: { include: { item: true } },
      },
    });
    if (!rental) throw new NotFoundException('대여 건을 찾을 수 없습니다.');

    if (
      rental.status === RentalStatus.CANCELED ||
      rental.status === RentalStatus.RETURNED
    ) {
      throw new BadRequestException('이미 종료된 대여 건입니다.');
    }

    const updated = await this.prisma.rental.update({
      where: { id },
      data: {
        status: newStatus,
        memo: memo,
        rentalHistories: {
          create: {
            changedBy: userId,
            oldStatus: rental.status,
            newStatus,
            memo,
          },
        },
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            studentId: true,
            phoneNumber: true,
            departmentType: true,
            departmentName: true,
            role: true,
            createdAt: true,
          },
        },
        rentalItems: { include: { item: true } },
      },
    });

    const itemSummary =
      updated.rentalItems.length > 0
        ? `${updated.rentalItems[0].item.name} 외 ${updated.rentalItems.length - 1}건`
        : '물품 없음';

    await this.smsService.sendRentalStatusNotice(
      updated.user.phoneNumber,
      updated.user.name,
      itemSummary,
      newStatus,
      memo,
    );

    return updated;
  }

  // 6. 예약 내용 수정 (날짜, 수량 변경) — 단일 rental 수정, items 각각 동일 날짜여야 함
  async update(id: number, userId: string, updateDto: UpdateRentalDto) {
    const { items, departmentType, departmentName } = updateDto;

    const rental = await this.prisma.rental.findFirst({
      where: { id, deletedAt: null },
      include: { rentalItems: true },
    });

    if (!rental) throw new NotFoundException('대여 건을 찾을 수 없습니다.');
    if (rental.userId !== userId)
      throw new ForbiddenException('수정 권한이 없습니다.');
    if (rental.status !== RentalStatus.RESERVED) {
      throw new BadRequestException('예약 상태일 때만 수정할 수 있습니다.');
    }

    // items가 있을 경우 날짜 추출 및 단일 그룹 검증
    let start: Date = rental.startDate;
    let end: Date = rental.endDate;

    if (items && items.length > 0) {
      const firstStartDate = items[0].startDate;
      const firstEndDate = items[0].endDate;

      if (firstStartDate || firstEndDate) {
        // 모든 items의 날짜가 동일해야 함
        for (const item of items) {
          if (item.startDate !== firstStartDate || item.endDate !== firstEndDate) {
            throw new BadRequestException(
              '예약 수정 시 모든 품목의 날짜는 동일해야 합니다. 날짜가 다른 경우 취소 후 재신청하세요.',
            );
          }
        }

        if (firstStartDate) start = new Date(firstStartDate);
        if (firstEndDate) end = new Date(firstEndDate);
      }
    }

    if (start > end) {
      throw new BadRequestException('종료일이 시작일보다 빠를 수 없습니다.');
    }

    if (items?.[0]?.startDate && (await this.holidaysService.isHoliday(start))) {
      throw new BadRequestException('수정하려는 시작일이 휴무일입니다.');
    }
    if (items?.[0]?.endDate && (await this.holidaysService.isHoliday(end))) {
      throw new BadRequestException('수정하려는 반납일이 휴무일입니다.');
    }

    return this.prisma.$transaction(async (tx) => {
      if (items) {
        for (const reqItem of items) {
          const item = await tx.item.findFirst({
            where: { id: reqItem.itemId, deletedAt: null },
          });
          if (!item)
            throw new NotFoundException(`물품(ID: ${reqItem.itemId}) 없음`);

          const totalQty = item.totalQuantity || 1;

          const overlappingRentals = await tx.rentalItem.findMany({
            where: {
              itemId: reqItem.itemId,
              rental: {
                id: { not: id },
                deletedAt: null,
                status: { in: [RentalStatus.RESERVED, RentalStatus.RENTED] },
                OR: [
                  {
                    startDate: { lte: end },
                    endDate: { gte: start },
                  },
                ],
              },
            },
            select: { quantity: true },
          });

          const otherReservedQty = overlappingRentals.reduce(
            (sum, r) => sum + r.quantity,
            0,
          );

          if (totalQty - otherReservedQty < reqItem.quantity) {
            throw new ConflictException(
              `'${item.name}'의 재고가 부족합니다. (가용: ${totalQty - otherReservedQty})`,
            );
          }
        }

        await tx.rentalItem.deleteMany({ where: { rentalId: id } });
        await tx.rental.update({
          where: { id },
          data: {
            startDate: start,
            endDate: end,
            departmentType: departmentType || rental.departmentType,
            departmentName: departmentName === null ? null : (departmentName || rental.departmentName),
            rentalItems: {
              create: items.map((i) => ({
                itemId: i.itemId,
                quantity: i.quantity,
              })),
            },
            rentalHistories: {
              create: {
                changedBy: userId,
                oldStatus: RentalStatus.RESERVED,
                newStatus: RentalStatus.RESERVED,
                memo: '예약 내용(날짜/수량) 수정',
              },
            },
          },
        });
      } else {
        await tx.rental.update({
          where: { id },
          data: {
            startDate: start,
            endDate: end,
            departmentType: departmentType || rental.departmentType,
            departmentName: departmentName === null ? null : (departmentName || rental.departmentName),
            rentalHistories: {
              create: {
                changedBy: userId,
                oldStatus: RentalStatus.RESERVED,
                newStatus: RentalStatus.RESERVED,
                memo: '예약 기간 수정',
              },
            },
          },
        });
      }

      return { message: '예약 정보가 성공적으로 수정되었습니다.' };
    });
  }

  // 7. 자동 연체 처리 스케줄러 (매일 오전 9시 KST)
  @Cron('0 9 * * *', { timeZone: 'Asia/Seoul' })
  async handleOverdueRentals() {
    console.log('[RentalsService] Running Automated Overdue Processing...');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueRentals = await this.prisma.rental.findMany({
      where: {
        status: RentalStatus.RENTED,
        deletedAt: null,
        endDate: {
          lt: today,
        },
      },
      include: {
        user: true,
        rentalItems: { include: { item: true } },
      },
    });

    console.log(`[RentalsService] Found ${overdueRentals.length} overdue rentals.`);

    for (const rental of overdueRentals) {
      await this.prisma.rental.update({
        where: { id: rental.id },
        data: {
          status: RentalStatus.OVERDUE,
          rentalHistories: {
            create: {
              changedBy: rental.userId,
              oldStatus: RentalStatus.RENTED,
              newStatus: RentalStatus.OVERDUE,
              memo: '반납 기한 도래로 인한 시스템 자동 연체 처리',
            },
          },
        },
      });

      const itemSummary =
        rental.rentalItems.length > 0
          ? `${rental.rentalItems[0].item.name} 외 ${rental.rentalItems.length - 1}건`
          : '물품 없음';

      await this.smsService.sendSMS(
        rental.user.phoneNumber,
        `[RentalWeb] ${rental.user.name}님, [${itemSummary}]의 반납 기한이 지났습니다. 현재 연체 상태이오니 즉시 반납 부탁드립니다.`,
      );
    }
  }

  // 8. 반납 안내 스케줄러 (매일 오전 10시 KST)
  @Cron('0 10 * * *', { timeZone: 'Asia/Seoul' })
  async handleRentalReminder() {
    console.log('[RentalsService] Running D-1 Return Reminder Scheduler...');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    const rentalsDueTomorrow = await this.prisma.rental.findMany({
      where: {
        status: RentalStatus.RENTED,
        deletedAt: null,
        endDate: {
          gte: tomorrow,
          lt: dayAfterTomorrow,
        },
      },
      include: {
        user: true,
        rentalItems: { include: { item: true } },
      },
    });

    console.log(
      `[RentalsService] Found ${rentalsDueTomorrow.length} rentals due tomorrow.`,
    );

    for (const rental of rentalsDueTomorrow) {
      const itemSummary =
        rental.rentalItems.length > 0
          ? `${rental.rentalItems[0].item.name} 외 ${rental.rentalItems.length - 1}건`
          : '물품 없음';

      const dueDateStr = rental.endDate.toISOString().split('T')[0];

      await this.smsService.sendReturnReminder(
        rental.user.phoneNumber,
        rental.user.name,
        itemSummary,
        dueDateStr,
      );
    }
  }
}
