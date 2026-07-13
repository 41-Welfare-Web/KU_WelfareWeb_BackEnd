import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { DeleteUserDto } from './dto/delete-user.dto';
import * as bcrypt from 'bcrypt';
import { Role, RentalStatus } from '@prisma/client';
import { getNowKst, getStartOfDayKst } from '../common/utils/date.util';
import { deriveRentalStatus } from '../rentals/rentals.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // 1. 전체 사용자 조회 (Admin Only)
  async findAll(
    page: number = 1,
    pageSize: number = 20,
    search?: string,
    role?: Role,
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc',
  ) {
    const skip = (page - 1) * pageSize;
    const where: any = { deletedAt: null };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { username: { contains: search } },
        { studentId: { contains: search } },
      ];
    }

    if (role) {
      where.role = role;
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      pagination: {
        page,
        pageSize,
        totalItems: total,
        totalPages: Math.ceil(total / pageSize),
      },
      users: items,
    };
  }

  // 2. 내 정보 조회
  async findMe(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');
    return user;
  }

  // 3. 회원 탈퇴 (Soft Delete)
  async deleteMe(userId: string, deleteUserDto: DeleteUserDto) {
    const { password } = deleteUserDto;
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: {
        _count: {
          select: {
            rentals: {
              where: {
                rentalItems: {
                  some: {
                    status: { in: [RentalStatus.RENTED, RentalStatus.OVERDUE] },
                  },
                },
                deletedAt: null,
              },
            },
          },
        },
      },
    });

    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    if (user.role === Role.ADMIN) {
      throw new ForbiddenException(
        '관리자 계정은 직접 탈퇴할 수 없습니다.',
      );
    }

    if ((user as any)._count.rentals > 0) {
      throw new BadRequestException('현재 대여 중인 물품이 있어 탈퇴할 수 없습니다.');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('비밀번호가 일치하지 않습니다.');
    }

    // Soft delete
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: getNowKst(),
        loginAttempts: 0, // 혹시 모를 재가입 대비 초기화
      },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'USER_WITHDRAWAL',
        targetType: 'USER',
        targetId: userId,
        details: { username: user.username }
      }
    });

    return { message: '회원 탈퇴가 성공적으로 처리되었습니다.' };
  }

  // 4. 특정 사용자 조회
  async findOne(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');
    return user;
  }

  // 5. 회원 정보 수정 (Password, Name, Department 등)
  async updateMe(userId: string, updateUserDto: UpdateUserDto) {
    const { currentPassword, newPassword, ...rest } = updateUserDto;

    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    // 1. 현재 비밀번호 확인
    const isMatch = await bcrypt.compare(currentPassword || '', user.password);
    if (!isMatch) {
      throw new ForbiddenException('현재 비밀번호가 일치하지 않습니다.');
    }

    // 2. 새 비밀번호 해싱
    let hashedPassword = user.password;
    if (newPassword) {
      hashedPassword = await bcrypt.hash(newPassword, 10);
    }

    // 3. 정보 업데이트
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...rest,
        password: hashedPassword,
      },
    });

    // 4. Audit Log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE_PROFILE',
        targetType: 'USER',
        targetId: userId,
        details: {
          changedFields: Object.keys(rest),
          passwordChanged: !!newPassword,
        },
      },
    });

    return updated;
  }

  // 5. 사용자 역할 변경 (Admin Only)
  async updateRole(userId: string, role: Role, actorId?: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { role },
    });

    // Audit Log
    await this.prisma.auditLog.create({
      data: {
        userId: actorId || null,
        action: 'UPDATE_USER_ROLE',
        targetType: 'USER',
        targetId: userId,
        details: { oldRole: user.role, newRole: role }
      }
    });

    return updated;
  }

  // 6. 내 대시보드 요약 정보 조회
  async getDashboardSummary(userId: string) {
    const today = getStartOfDayKst();

    const [activeRentalsCount, plotterOrdersCount, recentRentals] = await Promise.all([
      // 1. 활성 대여 (RENTED/OVERDUE 물품이 하나라도 있는 대여 건수)
      this.prisma.rental.count({
        where: {
          userId,
          rentalItems: {
            some: { status: { in: [RentalStatus.RENTED, RentalStatus.OVERDUE] } },
          },
          deletedAt: null,
        },
      }),
      // 2. 활성 플로터 주문
      this.prisma.plotterOrder.count({
        where: {
          userId,
          status: { in: ['PENDING', 'CONFIRMED', 'PRINTED'] },
          deletedAt: null,
        },
      }),
      // 3. 최근 대여 목록
      this.prisma.rental.findMany({
        where: { userId, deletedAt: null },
        take: 3,
        orderBy: { createdAt: 'desc' },
        include: {
          rentalItems: {
            include: { item: { select: { name: true } } },
          },
        },
      }),
    ]);

    const nearestReturn = await this.prisma.rental.findFirst({
      where: {
        userId,
        rentalItems: { some: { status: RentalStatus.RENTED } },
        endDate: { gte: today },
        deletedAt: null,
      },
      orderBy: { endDate: 'asc' },
      select: { endDate: true },
    });

    return {
      activeRentalsCount,
      nearestReturnDate: nearestReturn?.endDate || null,
      activePlotterOrdersCount: plotterOrdersCount,
      recentRentals: recentRentals.map((r: any) => {
        const statuses = r.rentalItems.map((ri: any) => ri.status);
        const representativeStatus = deriveRentalStatus(statuses);

        return {
          id: r.id,
          status: representativeStatus,
          startDate: r.startDate,
          endDate: r.endDate,
          itemSummary:
            r.rentalItems.length > 0
              ? `${r.rentalItems[0].item.name}${r.rentalItems.length > 1 ? ` 외 ${r.rentalItems.length - 1}건` : ''}`
              : '물품 없음',
        };
      }),
    };
  }
}
