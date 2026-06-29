import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePopupDto } from './dto/create-popup.dto';
import { UpdatePopupDto } from './dto/update-popup.dto';
import { getNowKst } from '../common/utils/date.util';

@Injectable()
export class PopupsService {
  constructor(private prisma: PrismaService) {}

  // 관리자: 전체 팝업 목록 (기간 무관)
  async findAll() {
    return this.prisma.popup.findMany({
      orderBy: { startDate: 'desc' },
    });
  }

  // 공개: 현재 활성 팝업 목록 (오늘 기준 기간 내 + isActive=true)
  async findActive() {
    // KST 달력 날짜를 UTC 자정으로 변환 (DB의 @db.Date 필드 저장 방식과 일치)
    const kstNow = getNowKst();
    const todayUtcMidnight = new Date(
      Date.UTC(kstNow.getFullYear(), kstNow.getMonth(), kstNow.getDate()),
    );
    return this.prisma.popup.findMany({
      where: {
        isActive: true,
        startDate: { lte: todayUtcMidnight },
        endDate: { gte: todayUtcMidnight },
      },
      orderBy: { startDate: 'asc' },
    });
  }

  async create(dto: CreatePopupDto) {
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (end < start) {
      throw new BadRequestException('종료일이 시작일보다 빠를 수 없습니다.');
    }

    return this.prisma.popup.create({
      data: {
        title: dto.title,
        content: dto.content,
        imageUrl: dto.imageUrl,
        startDate: start,
        endDate: end,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: number, dto: UpdatePopupDto) {
    await this.findOneOrFail(id);

    const start = dto.startDate ? new Date(dto.startDate) : undefined;
    const end = dto.endDate ? new Date(dto.endDate) : undefined;

    if (start && end && end < start) {
      throw new BadRequestException('종료일이 시작일보다 빠를 수 없습니다.');
    }

    return this.prisma.popup.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.content !== undefined && { content: dto.content }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
        ...(start !== undefined && { startDate: start }),
        ...(end !== undefined && { endDate: end }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async remove(id: number) {
    await this.findOneOrFail(id);
    await this.prisma.popup.delete({ where: { id } });
    return { message: '팝업이 삭제되었습니다.' };
  }

  private async findOneOrFail(id: number) {
    const popup = await this.prisma.popup.findUnique({ where: { id } });
    if (!popup) throw new NotFoundException('팝업을 찾을 수 없습니다.');
    return popup;
  }
}
