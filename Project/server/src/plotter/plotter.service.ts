import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlotterOrderDto } from './dto/create-plotter-order.dto';
import { PlotterStatus, Role } from '@prisma/client';

@Injectable()
export class PlotterService {
  constructor(private prisma: PrismaService) {}

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

    const { purpose, paper_size, page_count, is_paid_service } = createOrderDto;

    // 유료 서비스인데 영수증이 없는 경우 체크
    // form-data로 넘어오는 boolean은 문자열 'true'/'false'일 수 있으므로 변환 주의
    const isPaid = String(is_paid_service) === 'true';

    if (isPaid && !receiptFile) {
      throw new BadRequestException('유료 서비스는 입금 내역 이미지가 필요합니다.');
    }

    // 근무일 2일 뒤 수령 예정일 계산 (간단히 +2일로 구현, 주말 제외 로직은 추후 고도화)
    const pickupDate = new Date();
    pickupDate.setDate(pickupDate.getDate() + 2);

    // 실제로는 여기서 파일을 S3/Supabase Storage에 올리고 URL을 받아야 함
    const fileUrl = `https://storage.example.com/${pdfFile.filename}`;
    const paymentReceiptUrl = receiptFile
      ? `https://storage.example.com/${receiptFile.filename}`
      : null;

    const order = await this.prisma.plotterOrder.create({
      data: {
        userId,
        purpose,
        paperSize: paper_size,
        pageCount: Number(page_count),
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

    return this.mapToResponse(order);
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
      orders: orders.map((o) => this.mapToResponse(o)),
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

    return this.mapToResponse(updated);
  }

  private mapToResponse(o: any) {
    return {
      id: o.id,
      user: {
        name: o.user.name,
        student_id: o.user.studentId,
      },
      purpose: o.purpose,
      paper_size: o.paperSize,
      page_count: o.pageCount,
      is_paid_service: o.isPaidService,
      price: o.price,
      file_url: o.fileUrl,
      original_filename: o.originalFilename,
      payment_receipt_url: o.paymentReceiptUrl,
      pickup_date: o.pickupDate.toISOString().split('T')[0],
      status: o.status,
      rejection_reason: o.rejectionReason,
      created_at: o.createdAt,
    };
  }
}