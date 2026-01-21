import { Controller, Get, Put, Delete, Body, UseGuards, Query, Param, ParseUUIDPipe } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '@nestjs/passport';
import { GetUser } from '../auth/get-user.decorator';
import { UpdateUserDto } from './dto/update-user.dto';
import { DeleteUserDto } from './dto/delete-user.dto';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('users')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getMe(@GetUser() user: any) {
    return this.usersService.findMe(user.userId);
  }

  @Put('me')
  async updateMe(@GetUser() user: any, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.updateMe(user.userId, updateUserDto);
  }

  @Delete('me')
  async deleteMe(@GetUser() user: any, @Body() deleteUserDto: DeleteUserDto) {
    return this.usersService.deleteMe(user.userId, deleteUserDto);
  }

  // --- 관리자 전용 API ---

  @Get()
  @Roles(Role.ADMIN)
  async findAll(
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '20',
    @Query('search') search?: string,
    @Query('role') role?: Role,
  ) {
    return this.usersService.findAll(+page, +pageSize, search, role);
  }

  @Put(':id/role')
  @Roles(Role.ADMIN)
  async updateRole(
    @Param('id', ParseUUIDPipe) userId: string,
    @Body('role') role: Role,
  ) {
    return this.usersService.updateRole(userId, role);
  }
}