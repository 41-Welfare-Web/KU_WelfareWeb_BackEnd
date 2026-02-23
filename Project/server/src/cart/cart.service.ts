import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  async getCart(userId: string) {
    const items = await this.prisma.cartItem.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      include: {
        item: {
          include: {
            category: { select: { id: true, name: true } },
          },
        },
      },
    });

    const hasUnsetDates = items.some((i) => !i.startDate || !i.endDate);

    return {
      items,
      totalCount: items.length,
      hasUnsetDates,
    };
  }

  async addToCart(userId: string, dto: AddToCartDto) {
    const { itemId, quantity } = dto;

    const item = await this.prisma.item.findFirst({
      where: { id: itemId, deletedAt: null },
    });
    if (!item) {
      throw new NotFoundException(`물품(ID: ${itemId})을 찾을 수 없습니다.`);
    }

    const cartItem = await this.prisma.cartItem.upsert({
      where: { userId_itemId: { userId, itemId } },
      create: { userId, itemId, quantity },
      update: { quantity },
      include: {
        item: {
          include: { category: { select: { id: true, name: true } } },
        },
      },
    });

    return cartItem;
  }

  async updateCartItem(userId: string, id: number, dto: UpdateCartItemDto) {
    const cartItem = await this.prisma.cartItem.findUnique({ where: { id } });
    if (!cartItem) {
      throw new NotFoundException('장바구니 항목을 찾을 수 없습니다.');
    }
    if (cartItem.userId !== userId) {
      throw new ForbiddenException('접근 권한이 없습니다.');
    }

    const newStartDate =
      'startDate' in dto
        ? dto.startDate === null
          ? null
          : dto.startDate
        : undefined;
    const newEndDate =
      'endDate' in dto
        ? dto.endDate === null
          ? null
          : dto.endDate
        : undefined;

    const resolvedStart =
      newStartDate !== undefined
        ? newStartDate
          ? new Date(newStartDate)
          : null
        : cartItem.startDate;
    const resolvedEnd =
      newEndDate !== undefined
        ? newEndDate
          ? new Date(newEndDate)
          : null
        : cartItem.endDate;

    if (resolvedStart !== null && resolvedEnd !== null) {
      this.validateDates(resolvedStart, resolvedEnd);
    } else if (
      (resolvedStart === null) !== (resolvedEnd === null)
    ) {
      throw new BadRequestException(
        '시작일과 반납일은 함께 설정하거나 함께 초기화해야 합니다.',
      );
    }

    const updated = await this.prisma.cartItem.update({
      where: { id },
      data: {
        ...(dto.quantity !== undefined && { quantity: dto.quantity }),
        ...(newStartDate !== undefined && {
          startDate: newStartDate ? new Date(newStartDate) : null,
        }),
        ...(newEndDate !== undefined && {
          endDate: newEndDate ? new Date(newEndDate) : null,
        }),
      },
      include: {
        item: {
          include: { category: { select: { id: true, name: true } } },
        },
      },
    });

    return updated;
  }

  async removeFromCart(userId: string, id: number) {
    const cartItem = await this.prisma.cartItem.findUnique({ where: { id } });
    if (!cartItem) {
      throw new NotFoundException('장바구니 항목을 찾을 수 없습니다.');
    }
    if (cartItem.userId !== userId) {
      throw new ForbiddenException('접근 권한이 없습니다.');
    }

    await this.prisma.cartItem.delete({ where: { id } });
    return { message: '장바구니에서 제거되었습니다.' };
  }

  async clearCart(userId: string): Promise<void> {
    await this.prisma.cartItem.deleteMany({ where: { userId } });
  }

  private validateDates(start: Date, end: Date): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (start < today) {
      throw new BadRequestException('시작일은 오늘 이후여야 합니다.');
    }
    if (start > end) {
      throw new BadRequestException('반납일이 시작일보다 빠를 수 없습니다.');
    }
  }
}
