import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. API 경로 Prefix 설정 (예: http://localhost:3000/api/users)
  app.setGlobalPrefix('api');

  // 2. 입력값 유효성 검사 파이프 설정 (class-validator 사용)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // DTO에 정의되지 않은 속성은 자동으로 제거
      forbidNonWhitelisted: true, // DTO에 없는 속성이 오면 에러 발생
      transform: true, // 입력값을 DTO 클래스의 타입으로 자동 변환
    }),
  );

  // 3. CORS 설정 (프론트엔드와의 통신 허용)
  app.enableCors();

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();