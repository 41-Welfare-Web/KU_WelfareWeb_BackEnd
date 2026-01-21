import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  // 회원가입
  async register(registerDto: RegisterDto) {
    const { username, password, student_id, phone_number, name, department } =
      registerDto;

    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { studentId: student_id },
          { phoneNumber: phone_number },
        ],
      },
    });

    if (existingUser) {
      if (existingUser.username === username) {
        throw new ConflictException('이미 존재하는 아이디입니다.');
      }
      if (existingUser.studentId === student_id) {
        throw new ConflictException('이미 등록된 학번입니다.');
      }
      if (existingUser.phoneNumber === phone_number) {
        throw new ConflictException('이미 등록된 전화번호입니다.');
      }
    }

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt);

    try {
      const user = await this.prisma.user.create({
        data: {
          username,
          password: hashedPassword,
          name,
          studentId: student_id,
          phoneNumber: phone_number,
          department,
          role: 'USER',
        },
      });

      const tokens = this.generateTokens(user);

      return {
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
        },
        ...tokens,
      };
    } catch (error) {
      throw new InternalServerErrorException('회원가입 중 오류가 발생했습니다.');
    }
  }

  // 로그인
  async login(loginDto: LoginDto) {
    const { username, password } = loginDto;

    // 1. 사용자 찾기
    const user = await this.prisma.user.findUnique({
      where: { username },
    });

    // 2. 비밀번호 검증
    if (user && (await bcrypt.compare(password, user.password))) {
      // 3. 토큰 발급
      const tokens = this.generateTokens(user);
      return {
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
        },
        ...tokens,
      };
    } else {
      throw new UnauthorizedException('아이디 또는 비밀번호가 일치하지 않습니다.');
    }
  }

  // 토큰 생성 (공통 함수)
  private generateTokens(user: any) {
    const payload = { username: user.username, sub: user.id, role: user.role };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '14d' }); // 2주

    return {
      accessToken,
      refreshToken,
    };
  }
}
