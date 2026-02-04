import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  UseGuards,
  Query,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '@nestjs/passport';
import { GetUser } from '../auth/get-user.decorator';
import { UpdateUserDto } from './dto/update-user.dto';
import { DeleteUserDto } from './dto/delete-user.dto';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('사용자 (Users)')
@ApiBearerAuth()
@Controller('users')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: '내 정보 조회' })
  async getMe(@GetUser() user: any) {
    return this.usersService.findMe(user.userId);
  }

  @Put('me')
  @ApiOperation({ summary: '내 정보 수정' })
  async updateMe(@GetUser() user: any, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.updateMe(user.userId, updateUserDto);
  }

  @Delete('me')
  @ApiOperation({ summary: '회원 탈퇴' })
  async deleteMe(@GetUser() user: any, @Body() deleteUserDto: DeleteUserDto) {
    return this.usersService.deleteMe(user.userId, deleteUserDto);
  }

  // --- 관리자 전용 API ---

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '전체 사용자 목록 조회 (관리자)' })
  async findAll(
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '20',
    @Query('search') search?: string,
    @Query('role') role?: Role,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder: 'asc' | 'desc' = 'desc',
  ) {
    return this.usersService.findAll(
      +page,
      +pageSize,
      search,
      role,
      sortBy,
      sortOrder,
    );
  }

  @Put(':id/role')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '사용자 역할 변경 (관리자)' })
  async updateRole(
    @Param('id', ParseUUIDPipe) userId: string,
    @Body('role') role: Role,
  ) {
    return this.usersService.updateRole(userId, role);
  }
}
