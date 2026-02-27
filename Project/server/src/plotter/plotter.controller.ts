import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  Query,
  Param,
  Delete,
  Put,
  ParseIntPipe,
} from '@nestjs/common';
import { PlotterService } from './plotter.service';
import {
  CreatePlotterOrderDto,
  CreatePlotterOrderWithFilesDto,
} from './dto/create-plotter-order.dto';
import { PlotterPriceCheckDto } from './dto/plotter-price-check.dto';
import { AuthGuard } from '@nestjs/passport';
import { GetUser } from '../auth/get-user.decorator';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('플로터 (Plotter)')
@ApiBearerAuth()
@Controller('plotter')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class PlotterController {
  constructor(private readonly plotterService: PlotterService) {}

  @Post('calculate-price')
  @ApiOperation({ summary: '플로터 예상 가격 계산 (실시간 미리보기용)' })
  @ApiBody({ type: PlotterPriceCheckDto })
  calculatePrice(@GetUser() user: any, @Body() dto: PlotterPriceCheckDto) {
    return this.plotterService.calculateEstimatedPrice(dto, user.userId);
  }

  @Post('orders')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'pdfFile', maxCount: 1 },
      { name: 'paymentReceiptImage', maxCount: 1 },
    ]),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '플로터 주문 신청' })
  @ApiBody({ type: CreatePlotterOrderWithFilesDto })
  create(
    @GetUser() user: any,
    @Body() createOrderDto: CreatePlotterOrderDto,
    @UploadedFiles()
    files: {
      pdfFile?: Express.Multer.File[];
      paymentReceiptImage?: Express.Multer.File[];
    },
  ) {
    const pdfFile = files.pdfFile ? files.pdfFile[0] : undefined;
    const receiptFile = files.paymentReceiptImage
      ? files.paymentReceiptImage[0]
      : undefined;
    return this.plotterService.create(
      user.userId,
      createOrderDto,
      pdfFile,
      receiptFile,
    );
  }

  @Get('orders')
  @ApiOperation({ summary: '플로터 주문 목록 조회' })
  @ApiQuery({ name: 'page', required: false, example: '1' })
  @ApiQuery({ name: 'pageSize', required: false, example: '10' })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: '특정 사용자 ID 필터 (관리자 전용)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: '상태 필터 (PENDING, CONFIRMED 등)',
  })
  findAll(
    @GetUser() user: any,
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '10',
    @Query('userId') targetUserId?: string,
    @Query('status') status?: string,
  ) {
    return this.plotterService.findAll(
      user.userId,
      user.role,
      +page,
      +pageSize,
      targetUserId,
      status,
    );
  }

  @Delete('orders/:id')
  @ApiOperation({ summary: '플로터 주문 취소' })
  cancel(@GetUser() user: any, @Param('id', ParseIntPipe) id: number) {
    return this.plotterService.cancel(id, user.userId);
  }

  @Put('orders/:id/status')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '플로터 주문 상태 변경 (관리자)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'CONFIRMED' },
        rejectionReason: {
          type: 'string',
          example: 'PDF 파일 깨짐',
          nullable: true,
        },
      },
      required: ['status'],
    },
  })
  updateStatus(
    @GetUser() user: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status: string; rejectionReason?: string },
  ) {
    return this.plotterService.updateStatus(
      id,
      user.userId,
      body.status,
      body.rejectionReason,
    );
  }
}
