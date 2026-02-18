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
import { AddItemComponentDto } from './dto/add-item-component.dto';

@Injectable()
export class ItemsService {
  constructor(private prisma: PrismaService) {}

  async create(createItemDto: CreateItemDto) {
    const { categoryId, itemCode, name, description, imageUrl, managementType, totalQuantity } = createItemDto;

    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, deletedAt: null },
    });
    if (!category) throw new NotFoundException('존재하지 않는 카테고리입니다.');

    const existing = await this.prisma.item.findUnique({ where: { itemCode } });
    if (existing && !existing.deletedAt) throw new ConflictException('이미 존재하는 물품 코드입니다.');

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
    const where: any = { deletedAt: null };

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
    const item = await this.prisma.item.findFirst({
      where: { id, deletedAt: null },
      include: { category: true, components: { include: { component: true } } },
    });

    if (!item) throw new NotFoundException('물품을 찾을 수 없습니다.');

    return item;
  }

  async update(id: number, updateItemDto: UpdateItemDto) {
    const item = await this.prisma.item.findFirst({ where: { id, deletedAt: null } });
    if (!item) throw new NotFoundException('물품을 찾을 수 없습니다.');

    if (updateItemDto.itemCode && updateItemDto.itemCode !== item.itemCode) {
      const existing = await this.prisma.item.findUnique({
        where: { itemCode: updateItemDto.itemCode },
      });
      if (existing && !existing.deletedAt)
        throw new ConflictException('이미 존재하는 물품 코드입니다.');
    }

    return this.prisma.item.update({
      where: { id },
      data: updateItemDto,
      include: { category: true },
    });
  }

  async remove(id: number) {
    const item = await this.prisma.item.findFirst({
      where: { id, deletedAt: null },
      include: { _count: { select: { rentalItems: true } } },
    });

    if (!item) throw new NotFoundException('물품을 찾을 수 없습니다.');

    if (item._count.rentalItems > 0) {
      throw new ConflictException(
        '대여 기록이 있는 물품은 삭제할 수 없습니다.',
      );
    }

    await this.prisma.item.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { message: '물품이 삭제되었습니다.' };
  }

  // 6. 물품 미래 재고 조회 (캘린더용)
  async getAvailability(itemId: number, startDate: Date, endDate: Date) {
    const item = await this.prisma.item.findFirst({
      where: { id: itemId, deletedAt: null },
    });
    if (!item) throw new NotFoundException('물품을 찾을 수 없습니다.');

    const totalQty = item.totalQuantity || 0;
    const availability: any[] = [];

    const toLocalDateStr = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const current = new Date(startDate);
    const end = new Date(endDate);
    
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
      where: { itemId, deletedAt: null },
      orderBy: { serialNumber: 'asc' },
    });
  }

  // 8. 개별 실물 등록
  async createInstance(itemId: number, dto: CreateItemInstanceDto) {
    const item = await this.prisma.item.findFirst({ where: { id: itemId, deletedAt: null } });
    if (!item) throw new NotFoundException('물품을 찾을 수 없습니다.');

    const existing = await this.prisma.itemInstance.findUnique({
      where: { serialNumber: dto.serialNumber },
    });
    if (existing && !existing.deletedAt) throw new ConflictException('이미 존재하는 시리얼 번호입니다.');

    return this.prisma.itemInstance.create({
      data: {
        itemId,
        ...dto,
      },
    });
  }

  // 9. 개별 실물 수정
  async updateInstance(instanceId: number, dto: UpdateItemInstanceDto) {
    const instance = await this.prisma.itemInstance.findFirst({
      where: { id: instanceId, deletedAt: null },
    });
    if (!instance) throw new NotFoundException('실물을 찾을 수 없습니다.');

    if (dto.serialNumber && dto.serialNumber !== instance.serialNumber) {
      const existing = await this.prisma.itemInstance.findUnique({
        where: { serialNumber: dto.serialNumber },
      });
      if (existing && !existing.deletedAt) throw new ConflictException('이미 존재하는 시리얼 번호입니다.');
    }

    return this.prisma.itemInstance.update({
      where: { id: instanceId },
      data: dto,
    });
  }

  // 10. 개별 실물 삭제
  async removeInstance(instanceId: number) {
    const instance = await this.prisma.itemInstance.findFirst({
      where: { id: instanceId, deletedAt: null },
      include: { _count: { select: { rentalItems: true } } },
    });
    if (!instance) throw new NotFoundException('실물을 찾을 수 없습니다.');

    if (instance._count.rentalItems > 0) {
      throw new BadRequestException('대여 기록이 있는 실물은 삭제할 수 없습니다. 상태를 BROKEN으로 변경하세요.');
    }

    await this.prisma.itemInstance.update({
      where: { id: instanceId },
      data: { deletedAt: new Date() },
    });
    return { message: '실물이 삭제되었습니다.' };
  }

  // 11. 세트 구성품 추가
  async addComponent(parentId: number, dto: AddItemComponentDto) {
    if (parentId === dto.componentId) {
      throw new BadRequestException('자기 자신을 구성품으로 추가할 수 없습니다.');
    }

    const [parent, component] = await Promise.all([
      this.prisma.item.findFirst({ where: { id: parentId, deletedAt: null } }),
      this.prisma.item.findFirst({ where: { id: dto.componentId, deletedAt: null } }),
    ]);

    if (!parent || !component) {
      throw new NotFoundException('물품을 찾을 수 없습니다.');
    }

    return this.prisma.itemComponent.upsert({
      where: {
        parentId_componentId: {
          parentId,
          componentId: dto.componentId,
        },
      },
      update: { quantity: dto.quantity },
      create: {
        parentId,
        componentId: dto.componentId,
        quantity: dto.quantity,
      },
    });
  }

  // 12. 세트 구성품 삭제
  async removeComponent(parentId: number, componentId: number) {
    await this.prisma.itemComponent.delete({
      where: {
        parentId_componentId: {
          parentId,
          componentId,
        },
      },
    });
    return { message: '구성품이 세트에서 제외되었습니다.' };
  }
}
