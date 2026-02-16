import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { CreateItemInstanceDto } from './dto/create-item-instance.dto';
import { UpdateItemInstanceDto } from './dto/update-item-instance.dto';

@Injectable()
export class ItemsService {
  constructor(private prisma: PrismaService) {}

  async create(createItemDto: CreateItemDto) {
    const { categoryId, itemCode, name, description, imageUrl, managementType, totalQuantity } = createItemDto;

    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!category) throw new NotFoundException('존재하지 않는 카테고리입니다.');

    const existing = await this.prisma.item.findUnique({ where: { itemCode } });
    if (existing) throw new ConflictException('이미 존재하는 물품 코드입니다.');

    return this.prisma.item.create({
      data: {
        name,
        itemCode,
        description,
        imageUrl,
        managementType,
        totalQuantity: managementType === 'BULK' ? totalQuantity : null,
        category: {
          connect: { id: categoryId }
        }
      },
      include: { category: true },
    });
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
    else orderBy = { rentalCount: sortOrder };

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const items = await this.prisma.item.findMany({
      where,
      orderBy,
      include: {
        category: true,
        rentalItems: {
          where: {
            rental: {
              status: { in: ['RESERVED', 'RENTED'] },
              startDate: { lte: todayEnd },
              endDate: { gte: todayStart },
            },
          },
          select: { quantity: true },
        },
      },
    });

    return items.map((item) => {
      const reservedQty = item.rentalItems.reduce(
        (sum, ri) => sum + ri.quantity,
        0,
      );
      const { rentalItems, ...itemData } = item;
      return {
        ...itemData,
        currentStock: (item.totalQuantity || 0) - reservedQty,
      };
    });
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

    return this.prisma.item.update({
      where: { id },
      data: updateItemDto,
      include: { category: true },
    });
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

  // 6. 물품 미래 재고 조회 (캘린더용)
  async getAvailability(itemId: number, startDate: Date, endDate: Date) {
    const item = await this.prisma.item.findUnique({
      where: { id: itemId },
    });
    if (!item) throw new NotFoundException('물품을 찾을 수 없습니다.');

    const totalQty = item.totalQuantity || 0;
    const availability: any[] = [];

    // 날짜 객체에서 로컬 기준 'YYYY-MM-DD' 문자열을 추출하는 헬퍼
    const toLocalDateStr = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const current = new Date(startDate);
    const end = new Date(endDate);
    
    // 시각 차이로 인한 누락 방지를 위해 범위를 넉넉히 잡고 메모리에서 필터링
    const searchStart = new Date(startDate);
    searchStart.setDate(searchStart.getDate() - 1);
    const searchEnd = new Date(endDate);
    searchEnd.setDate(searchEnd.getDate() + 1);

    const rentals = await this.prisma.rentalItem.findMany({
      where: {
        itemId,
        rental: {
          status: { in: ['RESERVED', 'RENTED'] },
          startDate: { lte: searchEnd },
          endDate: { gte: searchStart },
        },
      },
      include: {
        rental: { select: { startDate: true, endDate: true } },
      },
    });

    while (current <= end) {
      const currentDateStr = toLocalDateStr(current);
      
      const reservedQty = rentals.reduce((sum, r) => {
        const rStartStr = toLocalDateStr(new Date(r.rental.startDate));
        const rEndStr = toLocalDateStr(new Date(r.rental.endDate));
        
        if (currentDateStr >= rStartStr && currentDateStr <= rEndStr) {
          return sum + r.quantity;
        }
        return sum;
      }, 0);

      availability.push({
        date: currentDateStr,
        availableQuantity: Math.max(0, totalQty - reservedQty),
        totalQuantity: totalQty,
      });

      current.setDate(current.getDate() + 1);
    }

    return availability;
  }

  // 7. 개별 실물 목록 조회
  async findInstances(itemId: number) {
    return this.prisma.itemInstance.findMany({
      where: { itemId },
      orderBy: { serialNumber: 'asc' },
    });
  }

  // 8. 개별 실물 등록
  async createInstance(itemId: number, dto: CreateItemInstanceDto) {
    const item = await this.prisma.item.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('물품을 찾을 수 없습니다.');

    const existing = await this.prisma.itemInstance.findUnique({
      where: { serialNumber: dto.serialNumber },
    });
    if (existing) throw new ConflictException('이미 존재하는 시리얼 번호입니다.');

    return this.prisma.itemInstance.create({
      data: {
        itemId,
        ...dto,
      },
    });
  }

  // 9. 개별 실물 수정
  async updateInstance(instanceId: number, dto: UpdateItemInstanceDto) {
    const instance = await this.prisma.itemInstance.findUnique({
      where: { id: instanceId },
    });
    if (!instance) throw new NotFoundException('실물을 찾을 수 없습니다.');

    if (dto.serialNumber && dto.serialNumber !== instance.serialNumber) {
      const existing = await this.prisma.itemInstance.findUnique({
        where: { serialNumber: dto.serialNumber },
      });
      if (existing) throw new ConflictException('이미 존재하는 시리얼 번호입니다.');
    }

    return this.prisma.itemInstance.update({
      where: { id: instanceId },
      data: dto,
    });
  }

  // 10. 개별 실물 삭제
  async removeInstance(instanceId: number) {
    const instance = await this.prisma.itemInstance.findUnique({
      where: { id: instanceId },
      include: { _count: { select: { rentalItems: true } } },
    });
    if (!instance) throw new NotFoundException('실물을 찾을 수 없습니다.');

    if (instance._count.rentalItems > 0) {
      throw new BadRequestException('대여 기록이 있는 실물은 삭제할 수 없습니다. 상태를 BROKEN으로 변경하세요.');
    }

    await this.prisma.itemInstance.delete({ where: { id: instanceId } });
    return { message: '실물이 삭제되었습니다.' };
  }
}
