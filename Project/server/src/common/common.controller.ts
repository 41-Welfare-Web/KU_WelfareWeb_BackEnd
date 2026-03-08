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
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
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
    // 1. DB에서 원래 방식대로 2D 배열 데이터를 가져옴
    const typeString = await this.configService.getValue(
      'plotter_departments_list',
      '',
    );
    const types = typeString ? typeString.split(',').map((t) => t.trim()) : [];

    const original2DArray = await Promise.all(
      types.map(async (type) => {
        if (!type) return [];
        const namesString = await this.configService.getValue(
          `dept_list_${type}`,
          '',
        );
        // dept_list_{type}에 값이 있으면 그걸 쓰고, 없으면 type 자체를 배열에 담아 반환
        return namesString
          ? namesString.split(',').map((n) => n.trim())
          : [type];
      }),
    );

    // 2. 2D 배열을 파싱하여 새로운 구조에 맞게 데이터를 가공
    const collegeOptions: string[] = [];
    const departmentOptions: string[] = [];
    const centralAutonomousOptions: string[] = [];

    original2DArray.forEach((arr) => {
      if (!arr || arr.length === 0) return;

      const mainCategory = arr[0];
      const subCategories = arr.slice(1);

      if (mainCategory === '총학생회') {
        centralAutonomousOptions.push(mainCategory);
      } else if (mainCategory === '중앙자치기구') {
        centralAutonomousOptions.push(...subCategories);
      } else if (
        subCategories.length > 0 &&
        (mainCategory.endsWith('대학') ||
          mainCategory.endsWith('과학원') ||
          mainCategory.endsWith('기술원'))
      ) {
        collegeOptions.push(mainCategory);
        departmentOptions.push(...subCategories);
      } else if (
        subCategories.length === 0 &&
        (mainCategory.endsWith('대학') ||
          mainCategory.endsWith('과학원') ||
          mainCategory.endsWith('기술원'))
      ) {
        collegeOptions.push(mainCategory);
      }
    });

    // 3. 최종적인 새로운 소속 목록 구조 정의
    const departments = [
      {
        category: '단과대 학생회',
        requiresInput: false,
        options: collegeOptions.map((c) => `${c} 학생회`),
      },
      {
        category: '학과 학생회',
        requiresInput: false,
        options: departmentOptions.map((d) => `${d} 학생회`),
      },
      {
        category: '중앙자치기구',
        requiresInput: false,
        options: centralAutonomousOptions,
      },
      {
        category: '중앙동아리',
        requiresInput: true,
        placeholder: '동아리 이름을 입력하세요',
      },
      {
        category: '과동아리',
        requiresInput: true,
        placeholder: '동아리 이름을 입력하세요',
      },
    ];

    // 4. 기타 메타데이터 조회
    const purposes = await this.configService.getValue('plotter_purposes', '');
    const freePurposes = await this.configService.getValue(
      'plotter_free_purposes',
      '',
    );
    const priceA0 = await this.configService.getValue('plotter_price_a0', '0');
    const priceA1 = await this.configService.getValue('plotter_price_a1', '0');

    return {
      departments: departments,
      purposes: purposes ? purposes.split(',').map((p) => p.trim()) : [],
      freePurposes: freePurposes
        ? freePurposes.split(',').map((p) => p.trim())
        : [],
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
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/jpg',
      'image/webp',
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        '이미지 파일(jpg, png, webp)만 업로드 가능합니다.',
      );
    }

    const url = await this.filesService.uploadFile(file, 'common');
    return { url };
  }
}
