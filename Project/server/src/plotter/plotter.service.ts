import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlotterOrderDto } from './dto/create-plotter-order.dto';
import { PlotterStatus, Role } from '@prisma/client';
import { FilesService } from '../common/files.service';
import { ConfigurationsService } from '../configurations/configurations.service';

@Injectable()
export class PlotterService {
  constructor(
    private prisma: PrismaService,
    private filesService: FilesService,
    private configService: ConfigurationsService,
  ) {}

  async create(
    userId: string,
    createOrderDto: CreatePlotterOrderDto,
    pdfFile: Express.Multer.File | undefined,
    receiptFile: Express.Multer.File | undefined,
  ) {
    if (!pdfFile) {
      throw new BadRequestException('PDF 파일이 필요합니다.');
    }
    if (pdfFile.mimetype !== 'application/pdf') {
      throw new BadRequestException('PDF 파일만 업로드 가능합니다.');
    }

    const { purpose, paperSize, pageCount, isPaidService } = createOrderDto;

    const isPaid = String(isPaidService) === 'true';

    if (isPaid && !receiptFile) {
      throw new BadRequestException('유료 서비스는 입금 내역 이미지가 필요합니다.');
    }

    // 파일 업로드 처리
    const fileUrl = await this.filesService.uploadFile(pdfFile, 'plotter/pdfs');
    const paymentReceiptUrl = receiptFile
      ? await this.filesService.uploadFile(receiptFile, 'plotter/receipts')
      : null;

    // 근무일 수령 예정일 계산 (Config 활용)
    const delayDaysStr = await this.configService.getValue(
      'plotter_pickup_delay_days',
      '2',
    );
    const delayDays = parseInt(delayDaysStr, 10);
    const pickupDate = new Date();
    pickupDate.setDate(pickupDate.getDate() + delayDays);
    // TODO: 주말/휴무일 제외 로직 추가 필요

    const order = await this.prisma.plotterOrder.create({
      data: {
        userId,
        purpose,
        paperSize,
        pageCount: Number(pageCount),
        isPaidService: isPaid,
        fileUrl,
        originalFilename: pdfFile.originalname,
        fileSize: pdfFile.size,
        paymentReceiptUrl,
        pickupDate,
        status: PlotterStatus.PENDING,
      },
      include: { user: { select: { name: true, studentId: true } } },
    });

    return order;
  }

  async findAll(
    userId: string,
    role: Role,
    page: number = 1,
    pageSize: number = 10,
    targetUserId?: string,
    status?: string,
  ) {
    const skip = (page - 1) * pageSize;
    const where: any = {};

    if (role === Role.ADMIN) {
      if (targetUserId) where.userId = targetUserId;
    } else {
      where.userId = userId;
    }

    if (status) {
      where.status = status;
    }

    const [orders, total] = await this.prisma.$transaction([
      this.prisma.plotterOrder.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true, studentId: true } } },
      }),
      this.prisma.plotterOrder.count({ where }),
    ]);

    return {
      pagination: {
        page,
        pageSize,
        totalItems: total,
        totalPages: Math.ceil(total / pageSize),
      },
      orders,
    };
  }

  async cancel(id: number, userId: string) {
    const order = await this.prisma.plotterOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('주문을 찾을 수 없습니다.');

    if (order.userId !== userId) throw new ForbiddenException('권한이 없습니다.');

    if (order.status !== PlotterStatus.PENDING) {
      throw new BadRequestException('주문 대기 상태일 때만 취소할 수 있습니다.');
    }

    await this.prisma.plotterOrder.delete({ where: { id } });
    return { message: '주문이 취소(삭제)되었습니다.' };
  }

  async updateStatus(
    id: number,
    adminId: string,
    status: string,
    rejectionReason?: string,
  ) {
    // Enum validation
    if (!Object.values(PlotterStatus).includes(status as PlotterStatus)) {
      throw new BadRequestException('유효하지 않은 상태 값입니다.');
    }

    if (status === PlotterStatus.REJECTED && !rejectionReason) {
      throw new BadRequestException('반려 시 사유를 입력해야 합니다.');
    }

    const order = await this.prisma.plotterOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('주문을 찾을 수 없습니다.');

    const updated = await this.prisma.plotterOrder.update({
      where: { id },
      data: {
        status: status as PlotterStatus,
        rejectionReason:
          status === PlotterStatus.REJECTED ? rejectionReason : null,
        plotterOrderHistories: {
          create: {
            changedBy: adminId,
            oldStatus: order.status,
            newStatus: status,
            memo: rejectionReason || `상태 변경: ${status}`,
          },
        },
      },
      include: { user: { select: { name: true, studentId: true } } },
    });

    return updated;
  }
}