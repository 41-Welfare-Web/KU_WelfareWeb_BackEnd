import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { PopupsService } from './popups.service';
import { CreatePopupDto } from './dto/create-popup.dto';
import { UpdatePopupDto } from './dto/update-popup.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';

@ApiTags('팝업 (Popups)')
@Controller('popups')
export class PopupsController {
  constructor(private readonly popupsService: PopupsService) {}

  // 공개: 현재 활성 팝업 목록
  @Get()
  @ApiOperation({ summary: '현재 활성 팝업 목록 조회 (All Users)' })
  findActive() {
    return this.popupsService.findActive();
  }

  // 관리자: 전체 팝업 목록
  @Get('admin')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '전체 팝업 목록 조회 [Admin]' })
  findAll() {
    return this.popupsService.findAll();
  }

  // 관리자: 팝업 생성
  @Post('admin')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '팝업 생성 [Admin]' })
  create(@Body() createPopupDto: CreatePopupDto) {
    return this.popupsService.create(createPopupDto);
  }

  // 관리자: 팝업 수정
  @Put('admin/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '팝업 수정 [Admin]' })
  @ApiParam({ name: 'id', type: Number })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePopupDto: UpdatePopupDto,
  ) {
    return this.popupsService.update(id, updatePopupDto);
  }

  // 관리자: 팝업 삭제
  @Delete('admin/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '팝업 삭제 [Admin]' })
  @ApiParam({ name: 'id', type: Number })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.popupsService.remove(id);
  }
}
