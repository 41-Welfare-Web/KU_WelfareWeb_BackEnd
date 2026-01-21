import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

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
}
