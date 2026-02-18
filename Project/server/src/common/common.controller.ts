import {
  Controller,
  Get,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FilesService } from './files.service';
import { AuthGuard } from '@nestjs/passport';
import { ConfigurationsService } from '../configurations/configurations.service';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { SmsService } from '../sms/sms.service';

@ApiTags('공통 (Common)')
@Controller('common')
export class CommonController {
  constructor(
    private readonly filesService: FilesService,
    private readonly configService: ConfigurationsService,
    private readonly prisma: PrismaService,
    private readonly smsService: SmsService,
  ) {}

  @Get('health')
  @ApiOperation({ summary: '시스템 헬스체크 및 서비스 진단' })
  async getHealth() {
    const dbStatus = await this.prisma.$queryRaw`SELECT 1`
      .then(() => 'UP')
      .catch(() => 'DOWN');

    const smsStatus = await this.smsService.checkStatus();
    const storageStatus = await this.filesService.checkStatus();

    return {
      status: dbStatus === 'UP' ? 'OK' : 'ERROR',
      timestamp: new Date().toISOString(),
      services: {
        database: dbStatus,
        sms: smsStatus,
        storage: storageStatus,
      },
    };
  }

  @Get('metadata')
  @ApiOperation({ summary: '공통 메타데이터 조회 (소속 리스트, 무료 목적 등)' })
  async getMetadata() {
    const departments = await this.configService.getValue('plotter_departments_list', '');
    const freePurposes = await this.configService.getValue('plotter_free_purposes', '');
    const priceA0 = await this.configService.getValue('plotter_price_a0', '0');
    const priceA1 = await this.configService.getValue('plotter_price_a1', '0');

    return {
      departments: departments ? departments.split(',').map((d) => d.trim()) : [],
      freePurposes: freePurposes ? freePurposes.split(',').map((p) => p.trim()) : [],
      prices: {
        a0: parseInt(priceA0, 10),
        a1: parseInt(priceA1, 10),
      },
    };
  }

  @Post('upload')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '이미지 업로드 (공용)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('파일이 없습니다.');
    }

    // 이미지 파일 형식 검증
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('이미지 파일(jpg, png, webp)만 업로드 가능합니다.');
    }

    const url = await this.filesService.uploadFile(file, 'common');
    return { url };
  }
}
