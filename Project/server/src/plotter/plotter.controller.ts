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
import { CreatePlotterOrderDto } from './dto/create-plotter-order.dto';
import { AuthGuard } from '@nestjs/passport';
import { GetUser } from '../auth/get-user.decorator';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { UpdateRentalStatusDto } from '../rentals/dto/update-rental-status.dto'; // 재사용하거나 새로 만듦. 여기서는 일단 body type any or specific dto.
// UpdatePlotterStatusDto가 없으므로 간단한 DTO 정의 필요 혹은 Body 객체 사용.
// 편의상 DTO 없이 Body로 처리하거나, `rentals`의 DTO와 구조가 비슷하다면 확인 필요.
// `rejection_reason`이 필요하므로 별도 DTO가 낫음. -> 일단 any로 받고 추후 DTO 생성 권장.
// 여기서는 일단 인라인으로 처리하거나 service에 위임.

@Controller('plotter')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class PlotterController {
  constructor(private readonly plotterService: PlotterService) {}

  @Post('orders')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'pdf_file', maxCount: 1 },
      { name: 'payment_receipt_image', maxCount: 1 },
    ]),
  )
  create(
    @GetUser() user: any,
    @Body() createOrderDto: CreatePlotterOrderDto,
    @UploadedFiles()
    files: {
      pdf_file?: Express.Multer.File[];
      payment_receipt_image?: Express.Multer.File[];
    },
  ) {
    const pdfFile = files.pdf_file ? files.pdf_file[0] : undefined;
    const receiptFile = files.payment_receipt_image
      ? files.payment_receipt_image[0]
      : undefined;
    return this.plotterService.create(
      user.userId,
      createOrderDto,
      pdfFile,
      receiptFile,
    );
  }

  @Get('orders')
  findAll(
    @GetUser() user: any,
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '10',
    @Query('user_id') targetUserId?: string,
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
  cancel(@GetUser() user: any, @Param('id', ParseIntPipe) id: number) {
    return this.plotterService.cancel(id, user.userId);
  }

  @Put('orders/:id/status')
  @Roles(Role.ADMIN)
  updateStatus(
    @GetUser() user: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status: string; rejection_reason?: string },
  ) {
    return this.plotterService.updateStatus(
      id,
      user.userId,
      body.status,
      body.rejection_reason,
    );
  }
}