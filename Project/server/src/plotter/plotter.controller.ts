import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { PlotterService } from './plotter.service';
import { CreatePlotterOrderDto } from './dto/create-plotter-order.dto';
import { AuthGuard } from '@nestjs/passport';
import { GetUser } from '../auth/get-user.decorator';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('plotter')
@UseGuards(AuthGuard('jwt'))
export class PlotterController {
  constructor(private readonly plotterService: PlotterService) {}

  @Post('orders')
  @UseInterceptors(FileInterceptor('pdf_file')) // form-data의 키 이름
  create(
    @GetUser() user: any,
    @Body() createOrderDto: CreatePlotterOrderDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.plotterService.create(user.userId, createOrderDto, file);
  }

  @Get('orders')
  findAll(@GetUser() user: any) {
    return this.plotterService.findAll(user.userId);
  }
}