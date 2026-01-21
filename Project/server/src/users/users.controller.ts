import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '@nestjs/passport';
import { GetUser } from '../auth/get-user.decorator';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
@UseGuards(AuthGuard('jwt'))
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
}