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
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        name: true,
        studentId: true,
        phoneNumber: true,
        department: true,
        role: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');
    
    return {
      id: user.id,
      username: user.username,
      name: user.name,
      student_id: user.studentId,
      phone_number: user.phoneNumber,
      department: user.department,
      role: user.role,
      created_at: user.createdAt,
    };
  }

  // 2. 내 정보 수정
  async updateMe(userId: string, updateUserDto: UpdateUserDto) {
    const { current_password, new_password, phone_number, department } =
      updateUserDto;

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    if (new_password) {
      if (!current_password) {
        throw new UnauthorizedException('비밀번호 변경을 위해 현재 비밀번호가 필요합니다.');
      }
      const isMatch = await bcrypt.compare(current_password, user.password);
      if (!isMatch) {
        throw new UnauthorizedException('현재 비밀번호가 일치하지 않습니다.');
      }
    }

    if (phone_number && phone_number !== user.phoneNumber) {
      const existing = await this.prisma.user.findUnique({
        where: { phoneNumber: phone_number },
      });
      if (existing) throw new ConflictException('이미 사용 중인 전화번호입니다.');
    }

    const data: any = {};
    if (new_password) {
      const salt = await bcrypt.genSalt();
      data.password = await bcrypt.hash(new_password, salt);
    }
    if (phone_number) data.phoneNumber = phone_number;
    if (department) data.department = department;

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        username: true,
        name: true,
        studentId: true,
        phoneNumber: true,
        department: true,
        role: true,
        createdAt: true,
      },
    });

    return {
      id: updatedUser.id,
      username: updatedUser.username,
      name: updatedUser.name,
      student_id: updatedUser.studentId,
      phone_number: updatedUser.phoneNumber,
      department: updatedUser.department,
      role: updatedUser.role,
      created_at: updatedUser.createdAt,
    };
  }

  // 3. 회원 탈퇴
  async deleteMe(userId: string, deleteUserDto: DeleteUserDto) {
    const { password } = deleteUserDto;
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('비밀번호가 일치하지 않습니다.');
    }

    await this.prisma.user.delete({ where: { id: userId } });

    return { message: '회원 탈퇴가 성공적으로 처리되었습니다.' };
  }

  // 4. 관리자: 전체 사용자 조회
  async findAll(page: number, pageSize: number, search?: string, role?: Role) {
    const skip = (page - 1) * pageSize;
    const where: any = {};

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

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          username: true,
          name: true,
          studentId: true,
          phoneNumber: true,
          department: true,
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
      users: users.map((u) => ({
        id: u.id,
        username: u.username,
        name: u.name,
        student_id: u.studentId,
        phone_number: u.phoneNumber,
        department: u.department,
        role: u.role,
        created_at: u.createdAt,
      })),
    };
  }

  // 5. 관리자: 사용자 역할 변경
  async updateRole(userId: string, role: Role) {
    if (!Object.values(Role).includes(role)) {
      throw new BadRequestException('유효하지 않은 역할입니다.');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { role },
    });

    return {
      id: updated.id,
      username: updated.username,
      name: updated.name,
      student_id: updated.studentId,
      phone_number: updated.phoneNumber,
      department: updated.department,
      role: updated.role,
      created_at: updated.createdAt,
    };
  }
}