import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Query,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { FilesService } from '../common/files.service';
import { GetUser } from '../auth/get-user.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('관리자 전용 (Admin)')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly filesService: FilesService,
  ) {}

  @Post('upload-image')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '이미지 업로드 (관리자 전용)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  async uploadImage(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: '.(png|jpeg|jpg|webp)' }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    const url = await this.filesService.uploadFile(file, 'items');
    return { url };
  }

  @Get('stats')
  @ApiOperation({ summary: '통계 데이터 조회' })
  getStats() {
    return this.adminService.getStats();
  }

  @Get('audit-logs')
  @ApiOperation({ summary: '감사 로그 조회' })
  @ApiQuery({ name: 'page', required: false, example: '1' })
  @ApiQuery({ name: 'pageSize', required: false, example: '20' })
  @ApiQuery({ name: 'search', required: false, description: '유저명 또는 대상 ID 검색' })
  @ApiQuery({ name: 'action', required: false, description: '특정 액션 필터' })
  getAuditLogs(
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '20',
    @Query('search') search?: string,
    @Query('action') action?: string,
  ) {
    return this.adminService.getAuditLogs(+page, +pageSize, search, action);
  }

  @Get('maintenance/status')
  @ApiOperation({ summary: 'DB 관리 현황 조회' })
  getDbStatus() {
    return this.adminService.getDbMaintenanceStatus();
  }

  @Post('maintenance/cleanup')
  @ApiOperation({ summary: 'DB 데이터 정밀 청소' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        purgeSoftDeleted: { type: 'boolean', description: '소프트 삭제된 데이터 영구 삭제' },
        deleteTestUsers: { type: 'boolean', description: '테스트 계정 및 관련 기록 삭제' },
        resetRentalCounts: { type: 'boolean', description: '물품 대여 횟수 초기화' },
      }
    }
  })
  cleanup(
    @GetUser() user: any,
    @Body() options: { purgeSoftDeleted?: boolean, deleteTestUsers?: boolean, resetRentalCounts?: boolean }
  ) {
    return this.adminService.cleanupDatabase(options, user.userId);
  }
}
