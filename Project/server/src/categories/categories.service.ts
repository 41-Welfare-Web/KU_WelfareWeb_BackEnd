import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(createCategoryDto: CreateCategoryDto) {
    const { name } = createCategoryDto;

    const existing = await this.prisma.category.findUnique({ where: { name } });
    if (existing) {
      throw new ConflictException('이미 존재하는 카테고리 이름입니다.');
    }

    return this.prisma.category.create({
      data: { name },
    });
  }

  async findAll() {
    return this.prisma.category.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async update(id: number, updateCategoryDto: UpdateCategoryDto) {
    const { name } = updateCategoryDto;

    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException('카테고리를 찾을 수 없습니다.');
    }

    if (name) {
      const existing = await this.prisma.category.findUnique({
        where: { name },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException('이미 존재하는 카테고리 이름입니다.');
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: updateCategoryDto,
    });
  }

  async remove(id: number) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { items: true } } },
    });

    if (!category) {
      throw new NotFoundException('카테고리를 찾을 수 없습니다.');
    }

    if (category._count.items > 0) {
      throw new ConflictException(
        '이 카테고리에 속한 물품이 있어 삭제할 수 없습니다.',
      );
    }

    await this.prisma.category.delete({ where: { id } });
    return { message: '카테고리가 성공적으로 삭제되었습니다.' };
  }
}
