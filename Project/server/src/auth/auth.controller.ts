import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { FindUsernameDto } from './dto/find-username.dto';
import { PasswordResetRequestDto } from './dto/password-reset-request.dto';
import { PasswordResetVerifyDto } from './dto/password-reset-verify.dto';
import { PasswordResetConfirmDto } from './dto/password-reset-confirm.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { SignupVerificationRequestDto } from './dto/signup-verification-request.dto';

import { SignupVerificationCheckDto } from './dto/signup-verification-check.dto';

@ApiTags('인증 (Auth)')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('request-signup-verification')
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 1분에 3회 제한
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '회원가입 인증번호 요청' })
  async requestSignupVerification(@Body() dto: SignupVerificationRequestDto) {
    return this.authService.requestSignupVerification(dto);
  }

  @Post('verify-signup-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '회원가입 인증번호 검증' })
  async verifySignupCode(@Body() dto: SignupVerificationCheckDto) {
    return this.authService.verifySignupCode(dto);
  }

  @Post('register')
  @ApiOperation({ summary: '회원가입' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '로그인' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('find-username')
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 1분에 3회 제한
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '아이디 찾기' })
  async findUsername(@Body() dto: FindUsernameDto) {
    return this.authService.findUsername(dto);
  }

  @Post('password-reset/request')
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 1분에 3회 제한
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '비밀번호 재설정 요청' })
  async requestPasswordReset(@Body() dto: PasswordResetRequestDto) {
    return this.authService.requestPasswordReset(dto);
  }

  @Post('password-reset/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '비밀번호 재설정 코드 검증 → resetToken 발급' })
  async verifyPasswordReset(@Body() dto: PasswordResetVerifyDto) {
    return this.authService.verifyPasswordReset(dto);
  }

  @Post('password-reset/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '비밀번호 재설정 확정 (resetToken + 새 비밀번호)' })
  async confirmPasswordReset(@Body() dto: PasswordResetConfirmDto) {
    return this.authService.confirmPasswordReset(dto);
  }

  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '로그아웃' })
  async logout(@Body() dto: LogoutDto) {
    return this.authService.logout(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '토큰 갱신' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }
}
