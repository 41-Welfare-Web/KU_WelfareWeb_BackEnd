import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ItemsService } from './items.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { GetInventoryAvailabilityDto } from './dto/get-inventory-availability.dto';
import { CreateItemInstanceDto } from './dto/create-item-instance.dto';
import { UpdateItemInstanceDto } from './dto/update-item-instance.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('물품 (Items)')
@Controller('items')
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '물품 생성 (관리자)' })
  create(@Body() createItemDto: CreateItemDto) {
    return this.itemsService.create(createItemDto);
  }

  @Get(':id/availability')
  @ApiOperation({ summary: '물품 날짜별 재고 조회 (캘린더용)' })
  getAvailability(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: GetInventoryAvailabilityDto,
  ) {
    return this.itemsService.getAvailability(
      id,
      new Date(query.startDate),
      new Date(query.endDate),
    );
  }

  @Get(':id/instances')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '개별 실물 목록 조회 (관리자)' })
  findInstances(@Param('id', ParseIntPipe) id: number) {
    return this.itemsService.findInstances(id);
  }

  @Post(':id/instances')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '개별 실물 등록 (관리자)' })
  createInstance(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateItemInstanceDto,
  ) {
    return this.itemsService.createInstance(id, dto);
  }

  @Put('instances/:instanceId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '개별 실물 상태 수정 (관리자)' })
  updateInstance(
    @Param('instanceId', ParseIntPipe) instanceId: number,
    @Body() dto: UpdateItemInstanceDto,
  ) {
    return this.itemsService.updateInstance(instanceId, dto);
  }

  @Delete('instances/:instanceId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '개별 실물 삭제 (관리자)' })
  removeInstance(@Param('instanceId', ParseIntPipe) instanceId: number) {
    return this.itemsService.removeInstance(instanceId);
  }

  @Get()
  @ApiOperation({ summary: '물품 목록 조회' })
  @ApiQuery({ name: 'search', required: false, description: '물품 이름 검색' })
  @ApiQuery({
    name: 'categoryIds',
    required: false,
    description: '카테고리 ID 목록 (쉼표 구분)',
  })
  findAll(
    @Query('search') search?: string,
    @Query('categoryIds') categoryIds?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder: 'asc' | 'desc' = 'desc',
  ) {
    return this.itemsService.findAll(search, categoryIds, sortBy, sortOrder);
  }

  @Get(':id')
  @ApiOperation({ summary: '물품 상세 조회' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.itemsService.findOne(id);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '물품 수정 (관리자)' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateItemDto: UpdateItemDto,
  ) {
    return this.itemsService.update(id, updateItemDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '물품 삭제 (관리자)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.itemsService.remove(id);
  }
}
