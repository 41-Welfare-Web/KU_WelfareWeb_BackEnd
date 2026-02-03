import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRentalDto } from './dto/create-rental.dto';
import { UpdateRentalStatusDto } from './dto/update-rental-status.dto';
import { RentalStatus, Role } from '@prisma/client';
import { ConfigurationsService } from '../configurations/configurations.service';

@Injectable()
export class RentalsService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigurationsService,
  ) {}

  // 1. 대여 예약 생성
  async create(userId: string, createRentalDto: CreateRentalDto) {
    const { startDate, endDate, items } = createRentalDto;
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
      throw new BadRequestException('종료일이 시작일보다 빠를 수 없습니다.');
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (start < today) {
      throw new BadRequestException('과거 날짜로 예약할 수 없습니다.');
    }

    // Config Check: 최대 대여 가능 기간
    const maxMonthsStr = await this.configService.getValue(
      'rental_max_period_months',
      '2',
    );
    const maxMonths = parseInt(maxMonthsStr, 10);
    const maxDate = new Date(today);
    maxDate.setMonth(maxDate.getMonth() + maxMonths);

    if (end > maxDate) {
      throw new BadRequestException(
        `최대 ${maxMonths}개월까지만 예약할 수 있습니다.`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      for (const reqItem of items) {
        const item = await tx.item.findUnique({
          where: { id: reqItem.itemId },
        });

        if (!item) {
          throw new NotFoundException(`물품(ID: ${reqItem.itemId})을 찾을 수 없습니다.`);
        }

        const totalQty = item.totalQuantity || 1;

        const overlappingRentals = await tx.rentalItem.findMany({
          where: {
            itemId: reqItem.itemId,
            rental: {
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

        const reservedQty = overlappingRentals.reduce(
          (sum, r) => sum + r.quantity,
          0,
        );

        if (totalQty - reservedQty < reqItem.quantity) {
          throw new ConflictException(
            `'${item.name}'의 재고가 부족합니다. (남은 수량: ${totalQty - reservedQty})`,
          );
        }
      }

      const rental = await tx.rental.create({
        data: {
          userId,
          startDate: start,
          endDate: end,
          status: RentalStatus.RESERVED,
          rentalItems: {
            create: items.map((i) => ({
              itemId: i.itemId,
              quantity: i.quantity,
            })),
          },
          rentalHistories: {
            create: {
              changedBy: userId,
              newStatus: RentalStatus.RESERVED,
              memo: '대여 예약 생성',
            },
          },
        },
        include: {
          rentalItems: {
            include: { item: true },
          },
        },
      });

      return rental;
    });
  }

  // 2. 대여 목록 조회
  async findAll(
    userId: string,
    role: Role,
    page: number = 1,
    pageSize: number = 10,
  ) {
    const skip = (page - 1) * pageSize;
    const where: any = {};

    if (role !== Role.ADMIN) {
      where.userId = userId;
    }

    const [rentals, total] = await this.prisma.$transaction([
      this.prisma.rental.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true, studentId: true } },
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
    const rental = await this.prisma.rental.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, studentId: true } },
        rentalItems: { include: { item: true } },
        rentalHistories: true,
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
    const rental = await this.prisma.rental.findUnique({ where: { id } });
    if (!rental) throw new NotFoundException('대여 건을 찾을 수 없습니다.');

    if (rental.userId !== userId) throw new ForbiddenException('권한이 없습니다.');
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
    return { message: '예약이 취소되었습니다.' };
  }

  // 5. 대여 상태 변경
  async updateStatus(
    id: number,
    userId: string,
    updateDto: UpdateRentalStatusDto,
  ) {
    const { status: newStatus, memo } = updateDto;

    const rental = await this.prisma.rental.findUnique({ where: { id } });
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
        rentalItems: { include: { item: true } },
      },
    });

    return updated;
  }
}