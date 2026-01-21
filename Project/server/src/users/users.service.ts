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

  // ... (기존 메서드들) ...

  // 관리자: 전체 사용자 조회 (페이지네이션, 검색)
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
      users,
    };
  }

  // 관리자: 사용자 역할 변경
  async updateRole(userId: string, role: Role) {
    // Enum 값 검증은 DTO나 컨트롤러 레벨에서 되지만 한 번 더 확인
    if (!Object.values(Role).includes(role)) {
      throw new BadRequestException('유효하지 않은 역할입니다.');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    return this.prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        username: true,
        role: true,
      },
    });
  }

  
  // ... (기존 메서드들) ...

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
}

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
    return user;
  }

  async updateMe(userId: string, updateUserDto: UpdateUserDto) {
    const { current_password, new_password, phone_number, department } =
      updateUserDto;

    // 1. 기존 사용자 정보 가져오기 (비밀번호 포함)
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    // 2. 비밀번호 변경 시 현재 비밀번호 확인
    if (new_password) {
      if (!current_password) {
        throw new UnauthorizedException('비밀번호 변경을 위해 현재 비밀번호가 필요합니다.');
      }
      const isMatch = await bcrypt.compare(current_password, user.password);
      if (!isMatch) {
        throw new UnauthorizedException('현재 비밀번호가 일치하지 않습니다.');
      }
    }

    // 3. 전화번호 중복 체크
    if (phone_number && phone_number !== user.phoneNumber) {
      const existing = await this.prisma.user.findUnique({
        where: { phoneNumber: phone_number },
      });
      if (existing) throw new ConflictException('이미 사용 중인 전화번호입니다.');
    }

    // 4. 업데이트 데이터 준비
    const data: any = {};
    if (new_password) {
      const salt = await bcrypt.genSalt();
      data.password = await bcrypt.hash(new_password, salt);
    }
    if (phone_number) data.phoneNumber = phone_number;
    if (department) data.department = department;

    // 5. DB 업데이트
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

    return updatedUser;
  }

  // 회원 탈퇴
  async deleteMe(userId: string, deleteUserDto: DeleteUserDto) {
    const { password } = deleteUserDto;
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('비밀번호가 일치하지 않습니다.'); // 403 Forbidden 대신 401 사용
    }

    // 실제로는 연관된 대여 기록 등이 있으면 삭제가 안 될 수 있습니다.
    // 이 경우 트랜잭션으로 처리하거나, soft delete를 고려해야 합니다.
    // 현재는 단순 삭제로 구현합니다.
    await this.prisma.user.delete({ where: { id: userId } });

    return { message: '회원 탈퇴가 성공적으로 처리되었습니다.' };
  }

  // 관리자: 전체 사용자 조회
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
      users,
    };
  }

  // 관리자: 사용자 역할 변경
  async updateRole(userId: string, role: Role) {
    if (!Object.values(Role).includes(role)) {
      throw new BadRequestException('유효하지 않은 역할입니다.');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    return this.prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        username: true,
        role: true,
      },
    });
  }
}
