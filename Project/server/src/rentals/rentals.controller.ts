import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  UseGuards,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { RentalsService } from './rentals.service';
import { CreateRentalDto } from './dto/create-rental.dto';
import { CreateRentalByAdminDto } from './dto/create-rental-by-admin.dto';
import { UpdateRentalStatusDto } from './dto/update-rental-status.dto';
import { AuthGuard } from '@nestjs/passport';
import { GetUser } from '../auth/get-user.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('대여 (Rentals)')
@ApiBearerAuth()
@Controller('rentals')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class RentalsController {
  constructor(private readonly rentalsService: RentalsService) {}

  @Post()
  @ApiOperation({ summary: '새 대여 예약 생성' })
  create(@GetUser() user: any, @Body() createRentalDto: CreateRentalDto) {
    return this.rentalsService.create(user.userId, createRentalDto, user.userId);
  }

  @Post('admin')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '사용자 대여 대리 신청 (관리자)' })
  createByAdmin(
    @GetUser() admin: any,
    @Body() createRentalByAdminDto: CreateRentalByAdminDto,
  ) {
    const { targetUserId, ...rest } = createRentalByAdminDto;
    return this.rentalsService.create(targetUserId, rest, admin.userId);
  }

  @Get()
  @ApiOperation({ summary: '대여 목록 조회' })
  findAll(
    @GetUser() user: any,
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '10',
  ) {
    return this.rentalsService.findAll(
      user.userId,
      user.role,
      +page,
      +pageSize,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: '대여 상세 조회' })
  findOne(@GetUser() user: any, @Param('id', ParseIntPipe) id: number) {
    return this.rentalsService.findOne(id, user.userId, user.role);
  }

  @Delete(':id')
  @ApiOperation({ summary: '대여 예약 취소' })
  cancel(@GetUser() user: any, @Param('id', ParseIntPipe) id: number) {
    return this.rentalsService.cancel(id, user.userId);
  }

  @Put(':id/status')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '대여 상태 변경 (관리자)' })
  updateStatus(
    @GetUser() user: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateRentalStatusDto,
  ) {
    return this.rentalsService.updateStatus(id, user.userId, updateDto);
  }
}
