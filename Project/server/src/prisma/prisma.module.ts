import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // 어디서든 PrismaService를 쓸 수 있게 Global로 설정
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}