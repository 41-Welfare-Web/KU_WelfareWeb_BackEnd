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
import { CleanupDatabaseDto } from './dto/cleanup-database.dto';
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

  @Get('notifications')
  @ApiOperation({ summary: '관리자 알림 조회 (새 대여/플로터 주문) [Admin]' })
  @ApiQuery({ name: 'since', required: false, description: '이 시각 이후 생성된 항목만 반환 (ISO 8601). 생략 시 최근 24시간' })
  getNotifications(@Query('since') since?: string) {
    return this.adminService.getNotifications(since);
  }

  @Get('maintenance/status')
  @ApiOperation({ summary: 'DB 관리 현황 조회' })
  getDbStatus() {
    return this.adminService.getDbMaintenanceStatus();
  }

  @Post('maintenance/cleanup')
  @ApiOperation({
    summary: 'DB 데이터 정밀 청소',
    description:
      '되돌릴 수 없는 영구 삭제이므로 기본값이 미리보기(dryRun: true)입니다. ' +
      '실제로 삭제하려면 dryRun: false를 명시해야 하며, 소프트 삭제 데이터는 ' +
      'olderThanDays(기본 90일, 최소 30일)가 지난 것만 삭제됩니다.',
  })
  @ApiBody({ type: CleanupDatabaseDto })
  cleanup(@GetUser() user: any, @Body() dto: CleanupDatabaseDto) {
    return this.adminService.cleanupDatabase(dto, user.userId);
  }
}
