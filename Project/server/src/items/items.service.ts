import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto'; // UpdateItemDto는 아래에서 생성 예정

@Injectable()
export class ItemsService {
  constructor(private prisma: PrismaService) {}

  async create(createItemDto: CreateItemDto) {
    const { categoryId, itemCode } = createItemDto;

    // 1. 카테고리 존재 확인
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!category) throw new NotFoundException('존재하지 않는 카테고리입니다.');

    // 2. 아이템 코드 중복 확인
    const existing = await this.prisma.item.findUnique({ where: { itemCode } });
    if (existing) throw new ConflictException('이미 존재하는 물품 코드입니다.');

    const item = await this.prisma.item.create({
      data: createItemDto,
      include: { category: true },
    });

    return item;
  }

  async findAll(
    search?: string,
    categoryIds?: string,
    sortBy: string = 'popularity',
    sortOrder: 'asc' | 'desc' = 'desc',
  ) {
    const where: any = {};

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    if (categoryIds) {
      const ids = categoryIds.split(',').map((id) => parseInt(id));
      where.categoryId = { in: ids };
    }

    let orderBy: any = {};
    if (sortBy === 'name') orderBy = { name: sortOrder };
    else if (sortBy === 'createdAt') orderBy = { createdAt: sortOrder };
    else orderBy = { rentalCount: sortOrder }; // 기본값 인기순

    const items = await this.prisma.item.findMany({
      where,
      orderBy,
      include: {
        category: true,
      },
    });

    return items.map((item) => ({
      ...item,
      currentStock: item.totalQuantity, // 임시: 현재 재고 계산 로직 필요
    }));
  }

  async findOne(id: number) {
    const item = await this.prisma.item.findUnique({
      where: { id },
      include: { category: true },
    });

    if (!item) throw new NotFoundException('물품을 찾을 수 없습니다.');

    return item;
  }

  async update(id: number, updateItemDto: UpdateItemDto) {
    const item = await this.prisma.item.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('물품을 찾을 수 없습니다.');

    if (updateItemDto.itemCode && updateItemDto.itemCode !== item.itemCode) {
      const existing = await this.prisma.item.findUnique({
        where: { itemCode: updateItemDto.itemCode },
      });
      if (existing)
        throw new ConflictException('이미 존재하는 물품 코드입니다.');
    }

    const updated = await this.prisma.item.update({
      where: { id },
      data: updateItemDto,
      include: { category: true },
    });

    return updated;
  }

  async remove(id: number) {
    const item = await this.prisma.item.findUnique({
      where: { id },
      include: { _count: { select: { rentalItems: true } } },
    });

    if (!item) throw new NotFoundException('물품을 찾을 수 없습니다.');

    if (item._count.rentalItems > 0) {
      throw new ConflictException(
        '대여 기록이 있는 물품은 삭제할 수 없습니다.',
      );
    }

    await this.prisma.item.delete({ where: { id } });
    return { message: '물품이 삭제되었습니다.' };
  }
}
