import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // Header에서 Bearer Token 추출
      ignoreExpiration: false, // 만료된 토큰 거부
      secretOrKey:
        configService.get<string>('JWT_SECRET') ?? 'defaultSecretKey', // 검증용 비밀키 (없으면 기본값)
    });
  }

  // 토큰 검증이 성공하면 실행되는 메서드
  async validate(payload: any) {
    const { sub: userId } = payload;

    // DB에 실제 사용자가 있는지 확인 (선택 사항이지만 보안상 좋음)
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    // request.user에 담길 객체 반환
    return { userId: user.id, username: user.username, role: user.role };
  }
}
