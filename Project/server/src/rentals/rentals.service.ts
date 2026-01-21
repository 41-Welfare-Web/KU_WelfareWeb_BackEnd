import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRentalDto } from './dto/create-rental.dto';
import { RentalStatus, Role } from '@prisma/client';

import { UpdateRentalStatusDto } from './dto/update-rental-status.dto';

@Injectable()
export class RentalsService {
  constructor(private prisma: PrismaService) {}
  
  // ... (기존 메서드들) ...

  // 5. 대여 상태 변경 (관리자)
  async updateStatus(
    id: number,
    userId: string,
    updateDto: UpdateRentalStatusDto,
  ) {
    const { status: newStatus, memo } = updateDto;

    const rental = await this.prisma.rental.findUnique({ where: { id } });
    if (!rental) throw new NotFoundException('대여 건을 찾을 수 없습니다.');

    // 상태 흐름 유효성 검사 (간단한 예시)
    if (
      rental.status === RentalStatus.CANCELED ||
      rental.status === RentalStatus.RETURNED
    ) {
      throw new BadRequestException('이미 종료된 대여 건입니다.');
    }

    await this.prisma.rental.update({
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
    });

    return { message: '상태가 변경되었습니다.', status: newStatus };
  }
}

  // 1. 대여 예약 생성
  async create(userId: string, createRentalDto: CreateRentalDto) {
    const { start_date, end_date, items } = createRentalDto;
    const start = new Date(start_date);
    const end = new Date(end_date);

    // 날짜 유효성 검사
    if (start > end) {
      throw new BadRequestException('종료일이 시작일보다 빠를 수 없습니다.');
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0); // 시간 제거
    if (start < today) {
      throw new BadRequestException('과거 날짜로 예약할 수 없습니다.');
    }

    // 트랜잭션으로 재고 확인 및 예약 생성을 묶어서 처리
    return this.prisma.$transaction(async (tx) => {
      // 각 아이템별 재고 확인
      for (const reqItem of items) {
        // (1) 물품 정보 조회 (전체 수량 확인)
        const item = await tx.item.findUnique({
          where: { id: reqItem.item_id },
        });

        if (!item) {
          throw new NotFoundException(`물품(ID: ${reqItem.item_id})을 찾을 수 없습니다.`);
        }

        // 관리 타입이 BULK인 경우와 INDIVIDUAL인 경우 처리가 다르지만,
        // 현재 스키마 상 totalQuantity로 통합 관리한다고 가정하고 단순화하여 구현합니다.
        // (추후 INDIVIDUAL은 개별 인스턴스 할당 로직 필요)
        const totalQty = item.totalQuantity || 1; // 기본값

        // (2) 해당 기간에 겹치는 예약된 수량 조회
        // 조건: 예약 기간이 겹치는 모든 'RESERVED' 또는 'RENTED' 상태의 건
        const overlappingRentals = await tx.rentalItem.findMany({
          where: {
            itemId: reqItem.item_id,
            rental: {
              status: { in: [RentalStatus.RESERVED, RentalStatus.RENTED] },
              OR: [
                // 겹치는 조건: (기존 시작일 <= 요청 종료일) AND (기존 종료일 >= 요청 시작일)
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

      // (3) 예약 생성
      const rental = await tx.rental.create({
        data: {
          userId,
          startDate: start,
          endDate: end,
          status: RentalStatus.RESERVED,
          rentalItems: {
            create: items.map((i) => ({
              itemId: i.item_id,
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

  // 2. 대여 목록 조회 (관리자: 전체, 사용자: 본인 것만)
  async findAll(userId: string, role: Role, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (role !== Role.ADMIN) {
      where.userId = userId;
    }

    const [rentals, total] = await this.prisma.$transaction([
      this.prisma.rental.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true, studentId: true } },
          rentalItems: { include: { item: { select: { name: true } } } },
        },
      }),
      this.prisma.rental.count({ where }),
    ]);

    return {
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      rentals,
    };
  }

  // 3. 대여 상세 조회
  async findOne(id: number, userId: string, role: Role) {
    const rental = await this.prisma.rental.findUnique({
      where: { id },
      include: {
        rentalItems: { include: { item: true } },
        rentalHistories: true,
      },
    });

    if (!rental) throw new NotFoundException('대여 건을 찾을 수 없습니다.');

    // 권한 체크: 관리자거나 본인만 조회 가능
    if (role !== Role.ADMIN && rental.userId !== userId) {
      throw new ForbiddenException('접근 권한이 없습니다.');
    }

    return rental;
  }

  // 4. 예약 취소 (사용자)
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

  // 5. 대여 상태 변경 (관리자)
  async updateStatus(
    id: number,
    userId: string,
    updateDto: UpdateRentalStatusDto,
  ) {
    const { status: newStatus, memo } = updateDto;

    const rental = await this.prisma.rental.findUnique({ where: { id } });
    if (!rental) throw new NotFoundException('대여 건을 찾을 수 없습니다.');

    // 상태 흐름 유효성 검사 (간단한 예시)
    if (
      rental.status === RentalStatus.CANCELED ||
      rental.status === RentalStatus.RETURNED
    ) {
      throw new BadRequestException('이미 종료된 대여 건입니다.');
    }

    await this.prisma.rental.update({
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
    });

    return { message: '상태가 변경되었습니다.', status: newStatus };
  }
}