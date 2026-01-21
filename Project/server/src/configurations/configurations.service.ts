import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateConfigDto } from './dto/update-config.dto';

@Injectable()
export class ConfigurationsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.configuration.findMany();
  }

  async update(updateConfigDto: UpdateConfigDto) {
    const { configKey, configValue } = updateConfigDto;

    const config = await this.prisma.configuration.findUnique({
      where: { configKey },
    });

    if (!config) throw new NotFoundException('설정 값을 찾을 수 없습니다.');

    await this.prisma.configuration.update({
      where: { configKey },
      data: { configValue },
    });

    return this.findAll(); // 변경된 전체 목록 반환
  }
}