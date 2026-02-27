import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { DeleteUserDto } from './dto/delete-user.dto';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // 1. 내 정보 조회
  async findMe(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
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
    });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');
    return user;
  }

  // 2. 내 정보 수정
  async updateMe(userId: string, updateUserDto: UpdateUserDto) {
    const { currentPassword, newPassword, phoneNumber, departmentType, departmentName } =
      updateUserDto;

    const user = await this.prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    if (newPassword) {
      if (!currentPassword) {
        throw new UnauthorizedException(
          '비밀번호 변경을 위해 현재 비밀번호가 필요합니다.',
        );
      }
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        throw new UnauthorizedException('현재 비밀번호가 일치하지 않습니다.');
      }
    }

    if (phoneNumber && phoneNumber !== user.phoneNumber) {
      const existing = await this.prisma.user.findFirst({
        where: { phoneNumber, deletedAt: null },
      });
      if (existing)
        throw new ConflictException('이미 사용 중인 전화번호입니다.');
    }

    const data: any = {};
    if (newPassword) {
      const salt = await bcrypt.genSalt();
      data.password = await bcrypt.hash(newPassword, salt);
    }
    if (phoneNumber) data.phoneNumber = phoneNumber;
    if (departmentType) {
      data.departmentType = departmentType;
      data.departmentName = departmentName ?? null;
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data,
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
    });

    return updatedUser;
  }

  // 3. 회원 탈퇴 (Soft Delete)
  async deleteMe(userId: string, deleteUserDto: DeleteUserDto) {
    const { password } = deleteUserDto;
    const user = await this.prisma.user.findFirst({ where: { id: userId, deletedAt: null } });

    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('비밀번호가 일치하지 않습니다.');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date() },
    });

    return { message: '회원 탈퇴가 성공적으로 처리되었습니다.' };
  }

  // 4. 관리자: 전체 사용자 조회
  async findAll(
    page: number,
    pageSize: number,
    search?: string,
    role?: Role,
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc',
  ) {
    const skip = (page - 1) * pageSize;
    const where: any = { deletedAt: null };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
        { studentId: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (role) {
      where.role = role;
    }

    let orderBy: any = {};
    const sortFieldMap: { [key: string]: string } = {
      name: 'name',
      studentId: 'studentId',
      createdAt: 'createdAt',
    };

    const prismaSortField = sortFieldMap[sortBy] || 'createdAt';
    orderBy = { [prismaSortField]: sortOrder };

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
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
      users,
    };
  }

  // 5. 관리자: 사용자 역할 변경
  async updateRole(userId: string, role: Role) {
    if (!Object.values(Role).includes(role)) {
      throw new BadRequestException('유효하지 않은 역할입니다.');
    }

    const user = await this.prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { role },
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
    });

    return updated;
  }

  // 6. 내 대시보드 요약 정보 조회
  async getDashboardSummary(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeRentalsCount = await this.prisma.rental.count({
      where: {
        userId,
        status: 'RENTED',
        deletedAt: null,
      },
    });

    const nearestReturn = await this.prisma.rental.findFirst({
      where: {
        userId,
        status: 'RENTED',
        endDate: { gte: today },
        deletedAt: null,
      },
      orderBy: { endDate: 'asc' },
      select: { endDate: true },
    });

    const plotterOrdersCount = await this.prisma.plotterOrder.count({
      where: {
        userId,
        status: { in: ['PENDING', 'CONFIRMED', 'PRINTED'] },
        deletedAt: null,
      },
    });

    const recentRentals = await this.prisma.rental.findMany({
      where: { userId, deletedAt: null },
      take: 3,
      orderBy: { createdAt: 'desc' },
      include: {
        rentalItems: {
          include: { item: { select: { name: true } } },
        },
      },
    });

    return {
      activeRentalsCount,
      nearestReturnDate: nearestReturn?.endDate || null,
      activePlotterOrdersCount: plotterOrdersCount,
      recentRentals: recentRentals.map((r) => ({
        id: r.id,
        status: r.status,
        startDate: r.startDate,
        endDate: r.endDate,
        itemSummary:
          r.rentalItems.length > 0
            ? `${r.rentalItems[0].item.name} 외 ${r.rentalItems.length - 1}건`
            : '물품 없음',
      })),
    };
  }
}
