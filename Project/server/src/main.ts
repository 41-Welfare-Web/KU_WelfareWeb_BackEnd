import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. API 경로 Prefix 설정
  app.setGlobalPrefix('api');

  // 2. Swagger 설정
  const config = new DocumentBuilder()
    .setTitle('RentalWeb API')
    .setDescription('RentalWeb 서비스의 API 명세서입니다.')
    .setVersion('1.0')
    .addBearerAuth() // JWT 인증 사용 설정
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  // 3. 입력값 유효성 검사 파이프 설정
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // 4. CORS 설정
  app.enableCors();

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
