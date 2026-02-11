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
import { SignupVerificationRequestDto } from './dto/signup-verification-request.dto';
import { SignupVerificationCheckDto } from './dto/signup-verification-check.dto';
import { LoginDto } from './dto/login.dto';
import { FindUsernameDto } from './dto/find-username.dto';
import { PasswordResetRequestDto } from './dto/password-reset-request.dto';
import { PasswordResetConfirmDto } from './dto/password-reset-confirm.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import * as bcrypt from 'bcrypt';
import { SmsService } from '../sms/sms.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private smsService: SmsService,
  ) {}

  // 인증번호 검증 (프론트엔드 버튼 활성화용)
  async verifySignupCode(dto: SignupVerificationCheckDto) {
    const { phoneNumber, verificationCode } = dto;

    const savedRecord = await this.prisma.verificationCode.findFirst({
      where: {
        target: phoneNumber,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!savedRecord || savedRecord.code !== verificationCode) {
      throw new BadRequestException('인증번호가 일치하지 않거나 만료되었습니다.');
    }

    return { success: true, message: '인증에 성공하였습니다.' };
  }

  // 회원가입용 인증번호 요청
  async requestSignupVerification(dto: SignupVerificationRequestDto) {
    const { phoneNumber } = dto;

    try {
      // 1. 이미 가입된 번호인지 확인
      const existingUser = await this.prisma.user.findUnique({
        where: { phoneNumber },
      });
      if (existingUser) {
        throw new ConflictException('이미 가입된 전화번호입니다.');
      }

      // 2. 24시간 내 발송 횟수 확인 (최대 5회)
      const oneDayAgo = new Date();
      oneDayAgo.setHours(oneDayAgo.getHours() - 24);

      const resendCount = await this.prisma.verificationCode.count({
        where: {
          target: phoneNumber,
          createdAt: { gte: oneDayAgo },
        },
      });

      if (resendCount >= 5) {
        throw new BadRequestException(
          '하루 최대 인증번호 발송 횟수(5회)를 초과하였습니다. 내일 다시 시도해주세요.',
        );
      }

      // 3. 인증번호 생성 및 저장
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 5); // 5분 유효

      await this.prisma.verificationCode.create({
        data: {
          target: phoneNumber,
          code,
          expiresAt,
        },
      });

      await this.smsService.sendVerificationCode(phoneNumber, code);

      return { 
        message: '인증번호가 발송되었습니다.',
        code: code // 프론트엔드에서 사용할 수 있도록 코드 반환
      };
    } catch (error) {
      console.error('[AuthService] Signup Verification Error:', error);
      if (error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }
      // 상세 에러 내용을 포함하여 던짐 (원인 파악용)
      throw new InternalServerErrorException({
        message: '인증번호 발송 처리 중 에러가 발생했습니다.',
        error: error.message,
        stack: error.stack,
        details: error
      });
    }
  }

  // 회원가입
  async register(registerDto: RegisterDto) {
    const {
      username,
      password,
      studentId,
      phoneNumber,
      name,
      department,
      verificationCode,
    } = registerDto;

    // 1. 인증번호 검증
    const savedRecord = await this.prisma.verificationCode.findFirst({
      where: {
        target: phoneNumber,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' }, // 가장 최근 것
    });

    if (!savedRecord) {
      throw new BadRequestException(
        '인증 코드가 만료되었거나 존재하지 않습니다. 다시 요청해주세요.',
      );
    }

    if (savedRecord.code !== verificationCode) {
      const updatedRecord = await this.prisma.verificationCode.update({
        where: { id: savedRecord.id },
        data: { attempts: { increment: 1 } },
      });

      if (updatedRecord.attempts >= 5) {
        await this.prisma.verificationCode.delete({
          where: { id: savedRecord.id },
        });
        throw new BadRequestException(
          '인증 시도 횟수를 초과(5회)하였습니다. 다시 요청해주세요.',
        );
      }

      throw new BadRequestException(
        `인증 코드가 일치하지 않습니다. (현재 실패 횟수: ${updatedRecord.attempts}/5)`,
      );
    }

    // 2. 중복 확인
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ username }, { studentId }, { phoneNumber }],
      },
    });

    if (existingUser) {
      if (existingUser.username === username) {
        throw new ConflictException('이미 존재하는 아이디입니다.');
      }
      if (existingUser.studentId === studentId) {
        throw new ConflictException('이미 등록된 학번입니다.');
      }
      if (existingUser.phoneNumber === phoneNumber) {
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
          studentId,
          phoneNumber,
          department,
          role: 'USER',
        },
      });

      // 4. 인증 코드 삭제
      await this.prisma.verificationCode.deleteMany({
        where: { target: phoneNumber },
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
      throw new InternalServerErrorException(
        '회원가입 중 오류가 발생했습니다.',
      );
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
      throw new UnauthorizedException(
        '아이디 또는 비밀번호가 일치하지 않습니다.',
      );
    }
  }

  // 아이디 찾기
  async findUsername(dto: FindUsernameDto) {
    const { name, phoneNumber } = dto;
    const user = await this.prisma.user.findFirst({
      where: { name, phoneNumber },
    });

    // 보안상 사용자가 존재하는지 여부를 명확히 알리지 않음
    if (user) {
      await this.smsService.sendSMS(
        phoneNumber,
        `[RentalWeb] 회원님의 아이디는 [${user.username}] 입니다.`,
      );
    }

    return {
      message:
        '요청이 접수되었습니다. 가입된 정보와 일치하는 경우, SMS로 아이디를 발송해 드립니다.',
    };
  }

  // 비밀번호 재설정 요청
  async requestPasswordReset(dto: PasswordResetRequestDto) {
    const { username, phoneNumber } = dto;
    const user = await this.prisma.user.findFirst({
      where: { username, phoneNumber },
    });

    if (user) {
      // 24시간 내 발송 횟수 확인 (최대 5회)
      const oneDayAgo = new Date();
      oneDayAgo.setHours(oneDayAgo.getHours() - 24);

      const resendCount = await this.prisma.verificationCode.count({
        where: {
          target: username,
          createdAt: { gte: oneDayAgo },
        },
      });

      if (resendCount >= 5) {
        throw new BadRequestException(
          '하루 최대 인증번호 발송 횟수(5회)를 초과하였습니다. 내일 다시 시도해주세요.',
        );
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 5); // 5분 유효

      await this.prisma.verificationCode.create({
        data: {
          target: username,
          code,
          expiresAt,
        },
      });

      await this.smsService.sendVerificationCode(phoneNumber, code);
    }

    return {
      message:
        '요청이 접수되었습니다. 가입된 정보와 일치하는 경우, SMS로 인증 코드를 발송해 드립니다.',
    };
  }

  // 비밀번호 재설정 확정
  async confirmPasswordReset(dto: PasswordResetConfirmDto) {
    const { username, verificationCode, newPassword } = dto;

    // 1. 해당 유저의 유효한 인증 코드 조회
    const savedRecord = await this.prisma.verificationCode.findFirst({
      where: {
        target: username,
        expiresAt: { gt: new Date() }, // 만료되지 않은 것만 조회
      },
    });

    if (!savedRecord) {
      throw new BadRequestException(
        '인증 코드가 만료되었거나 존재하지 않습니다. 다시 요청해주세요.',
      );
    }

    // 2. 코드 일치 여부 확인
    if (savedRecord.code !== verificationCode) {
      // 시도 횟수 증가
      const updatedRecord = await this.prisma.verificationCode.update({
        where: { id: savedRecord.id },
        data: { attempts: { increment: 1 } },
      });

      // 5회 이상 실패 시 코드 무효화
      if (updatedRecord.attempts >= 5) {
        await this.prisma.verificationCode.delete({
          where: { id: savedRecord.id },
        });
        throw new BadRequestException(
          '인증 시도 횟수를 초과(5회)하였습니다. 다시 요청해주세요.',
        );
      }

      throw new BadRequestException(
        `인증 코드가 일치하지 않습니다. (현재 실패 횟수: ${updatedRecord.attempts}/5)`,
      );
    }

    // 3. 코드 일치 시 비밀번호 변경 로직 진행
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await this.prisma.user.update({
      where: { username },
      data: { password: hashedPassword },
    });

    // 사용 완료된 인증 코드 삭제
    await this.prisma.verificationCode.delete({
      where: { id: savedRecord.id },
    });

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
