import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { FindUsernameDto } from './dto/find-username.dto';
import { PasswordResetRequestDto } from './dto/password-reset-request.dto';
import { PasswordResetConfirmDto } from './dto/password-reset-confirm.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  // 임시 인증 코드 저장소 (운영 환경에서는 Redis 등을 사용 권장)
  private verificationCodes = new Map<string, string>();

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

  // 아이디 찾기
  async findUsername(dto: FindUsernameDto) {
    const { name, phone_number } = dto;
    const user = await this.prisma.user.findFirst({
      where: { name, phoneNumber: phone_number },
    });

    // 보안상 사용자가 존재하는지 여부를 명확히 알리지 않음
    if (user) {
      console.log(`[SMS 발송] ${phone_number}: 회원님의 아이디는 ${user.username} 입니다.`);
    }

    return {
      message:
        '요청이 접수되었습니다. 가입된 정보와 일치하는 경우, SMS로 아이디를 발송해 드립니다.',
    };
  }

  // 비밀번호 재설정 요청
  async requestPasswordReset(dto: PasswordResetRequestDto) {
    const { username, phone_number } = dto;
    const user = await this.prisma.user.findFirst({
      where: { username, phoneNumber: phone_number },
    });

    if (user) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      this.verificationCodes.set(username, code);
      // 5분 후 만료
      setTimeout(() => this.verificationCodes.delete(username), 5 * 60 * 1000);

      console.log(`[SMS 발송] ${phone_number}: 인증 코드는 [${code}] 입니다.`);
    }

    return {
      message:
        '요청이 접수되었습니다. 가입된 정보와 일치하는 경우, SMS로 인증 코드를 발송해 드립니다.',
    };
  }

  // 비밀번호 재설정 확정
  async confirmPasswordReset(dto: PasswordResetConfirmDto) {
    const { username, verification_code, new_password } = dto;

    const savedCode = this.verificationCodes.get(username);

    if (!savedCode || savedCode !== verification_code) {
      throw new BadRequestException('인증 코드가 일치하지 않거나 만료되었습니다.');
    }

    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(new_password, salt);

    await this.prisma.user.update({
      where: { username },
      data: { password: hashedPassword },
    });

    this.verificationCodes.delete(username);

    return { message: '비밀번호가 성공적으로 변경되었습니다.' };
  }

  // 로그아웃
  async logout(dto: LogoutDto) {
    // Stateless JWT이므로 서버에서 할 일은 없으나, 추후 블랙리스트 등을 위해 인터페이스 유지
    return { message: 'Successfully logged out.' };
  }

  // 토큰 갱신
  async refresh(dto: RefreshTokenDto) {
    const { refreshToken } = dto;

    try {
      const payload = this.jwtService.verify(refreshToken);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('존재하지 않는 사용자입니다.');
      }

      const tokens = this.generateTokens(user);
      return tokens;
    } catch (e) {
      throw new UnauthorizedException('유효하지 않은 토큰입니다.');
    }
  }

  // 토큰 생성 (공통 함수)
  private generateTokens(user: any) {
    const payload = { username: user.username, sub: user.id, role: user.role };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' }); // 15분
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '14d' }); // 2주

    return {
      accessToken,
      refreshToken,
    };
  }
}
