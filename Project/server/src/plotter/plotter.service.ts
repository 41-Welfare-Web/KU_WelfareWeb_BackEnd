import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlotterOrderDto } from './dto/create-plotter-order.dto';

@Injectable()
export class PlotterService {
  constructor(private prisma: PrismaService) {}

  async create(
    userId: string,
    createOrderDto: CreatePlotterOrderDto,
    file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('PDF 파일이 필요합니다.');
    }
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('PDF 파일만 업로드 가능합니다.');
    }

    // 근무일 2일 뒤 수령 예정일 계산 (간단히 +2일로 구현, 주말 제외 로직은 추후 고도화)
    const pickupDate = new Date();
    pickupDate.setDate(pickupDate.getDate() + 2);

    // 실제로는 여기서 파일을 S3/Supabase Storage에 올리고 URL을 받아야 함
    // 현재는 로컬 파일명이나 임시 경로를 저장한다고 가정
    const fileUrl = `https://storage.example.com/${file.filename}`;

    const { purpose, paper_size, page_count, is_paid_service } = createOrderDto;

    return this.prisma.plotterOrder.create({
      data: {
        userId,
        purpose,
        paperSize: paper_size,
        pageCount: page_count,
        isPaidService: is_paid_service,
        fileUrl,
        originalFilename: file.originalname,
        fileSize: file.size,
        pickupDate,
        // 결제 영수증 URL 등은 유료일 경우 추가 로직 필요
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.plotterOrder.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}