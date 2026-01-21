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
import { UpdateRentalStatusDto } from './dto/update-rental-status.dto';
import { AuthGuard } from '@nestjs/passport';
import { GetUser } from '../auth/get-user.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('rentals')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class RentalsController {
  constructor(private readonly rentalsService: RentalsService) {}

  @Post()
  create(@GetUser() user: any, @Body() createRentalDto: CreateRentalDto) {
    return this.rentalsService.create(user.userId, createRentalDto);
  }

  @Get()
  findAll(
    @GetUser() user: any,
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '10',
  ) {
    return this.rentalsService.findAll(user.userId, user.role, +page, +pageSize);
  }

  @Get(':id')
  findOne(@GetUser() user: any, @Param('id', ParseIntPipe) id: number) {
    return this.rentalsService.findOne(id, user.userId, user.role);
  }

  @Delete(':id')
  cancel(@GetUser() user: any, @Param('id', ParseIntPipe) id: number) {
    return this.rentalsService.cancel(id, user.userId);
  }

  @Put(':id/status')
  @Roles(Role.ADMIN)
  updateStatus(
    @GetUser() user: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateRentalStatusDto,
  ) {
    return this.rentalsService.updateStatus(id, user.userId, updateDto);
  }
}