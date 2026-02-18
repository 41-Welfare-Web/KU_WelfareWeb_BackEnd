import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlotterOrderDto } from './dto/create-plotter-order.dto';
import { PlotterPriceCheckDto } from './dto/plotter-price-check.dto';
import { PlotterStatus, Role } from '@prisma/client';
import { FilesService } from '../common/files.service';
import { ConfigurationsService } from '../configurations/configurations.service';
import { HolidaysService } from '../holidays/holidays.service';
import { SmsService } from '../sms/sms.service';

@Injectable()
export class PlotterService {
  constructor(
    private prisma: PrismaService,
    private filesService: FilesService,
    private configService: ConfigurationsService,
    private holidaysService: HolidaysService,
    private smsService: SmsService,
  ) {}

  // 가격 및 무료 여부 계산 (공통 로직)
  async calculateEstimatedPrice(dto: PlotterPriceCheckDto) {
    const { department, purpose, paperSize, pageCount } = dto;

    const unitPriceStr = await this.configService.getValue(
      `plotter_price_${paperSize.toLowerCase()}`,
      '0',
    );
    const unitPrice = parseInt(unitPriceStr, 10);
    let totalPrice = unitPrice * Number(pageCount);

    // 무료 조건 체크
    const freeDeptsStr = await this.configService.getValue('plotter_free_departments', '');
    const freePurposesStr = await this.configService.getValue('plotter_free_purposes', '');

    const freeDepts = freeDeptsStr.split(',').map((d) => d.trim());
    const freePurposes = freePurposesStr.split(',').map((p) => p.trim());

    const isFreeDept = freeDepts.includes(department);
    const isFreePurpose = freePurposes.includes(purpose);

    let message = `인쇄 비용은 총 ${totalPrice.toLocaleString()}원입니다.`;
    if (isFreeDept && isFreePurpose) {
      totalPrice = 0;
      message = `${department} 소속 및 ${purpose} 목적으로 인해 무료 인쇄 대상입니다.`;
    } else if (totalPrice > 0) {
      message += ' 입금 확인증(영수증) 업로드가 필요합니다.';
    }

    return {
      price: totalPrice,
      isFree: totalPrice === 0,
      message,
    };
  }

  async create(
    userId: string,
    createOrderDto: CreatePlotterOrderDto,
    pdfFile: Express.Multer.File | undefined,
    receiptFile: Express.Multer.File | undefined,
  ) {
    if (!pdfFile) {
      throw new BadRequestException('PDF 파일이 필요합니다.');
    }

    // 1. MIME Type 체크 (기본)
    if (pdfFile.mimetype !== 'application/pdf') {
      throw new BadRequestException('PDF 파일만 업로드 가능합니다.');
    }

    // 2. Magic Number 체크 (실제 파일 내용 검증)
    const header = pdfFile.buffer.slice(0, 5).toString();
    if (header !== '%PDF-') {
      throw new BadRequestException(
        '유효하지 않은 PDF 형식입니다. 실제 PDF 파일을 업로드해주세요.',
      );
    }

    const { purpose, paperSize, pageCount, department } = createOrderDto;

    // 3. 사용자 정보 조회 (삭제되지 않은 유저만)
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    // 4. 가격 계산 및 유/무료 판별 로직 호출
    const { price: totalPrice, isFree } = await this.calculateEstimatedPrice({
      department,
      purpose,
      paperSize,
      pageCount,
    });

    const isPaid = totalPrice > 0;

    if (isPaid && !receiptFile) {
      throw new BadRequestException(
        `해당 주문은 유료 서비스(${totalPrice}원)입니다. 입금 내역 이미지를 업로드해주세요.`,
      );
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

    // 영업일 기준 수령일 계산
    const pickupDate = await this.holidaysService.calculateBusinessDate(
      new Date(),
      delayDays,
    );

    const order = await this.prisma.plotterOrder.create({
      data: {
        userId,
        purpose,
        paperSize,
        pageCount: Number(pageCount),
        isPaidService: isPaid,
        price: totalPrice,
        fileUrl,
        originalFilename: pdfFile.originalname,
        fileSize: pdfFile.size,
        paymentReceiptUrl,
        pickupDate,
        status: PlotterStatus.PENDING,
      },
      include: {
        user: { select: { name: true, studentId: true, department: true } },
      },
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
    const where: any = { deletedAt: null };

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
    const order = await this.prisma.plotterOrder.findFirst({
      where: { id, deletedAt: null },
    });
    if (!order) throw new NotFoundException('주문을 찾을 수 없습니다.');

    if (order.userId !== userId)
      throw new ForbiddenException('권한이 없습니다.');

    if (order.status !== PlotterStatus.PENDING) {
      throw new BadRequestException(
        '주문 대기 상태일 때만 취소할 수 있습니다.',
      );
    }

    await this.prisma.plotterOrder.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { message: '주문이 취소되었습니다.' };
  }

  async updateStatus(
    id: number,
    adminId: string,
    status: string,
    rejectionReason?: string,
  ) {
    if (!Object.values(PlotterStatus).includes(status as PlotterStatus)) {
      throw new BadRequestException('유효하지 않은 상태 값입니다.');
    }

    if (status === PlotterStatus.REJECTED && !rejectionReason) {
      throw new BadRequestException('반려 시 사유를 입력해야 합니다.');
    }

    const order = await this.prisma.plotterOrder.findFirst({
      where: { id, deletedAt: null },
    });
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
      include: { user: true },
    });

    await this.smsService.sendPlotterStatusNotice(
      updated.user.phoneNumber,
      updated.user.name,
      status,
      rejectionReason,
    );

    return updated;
  }
}
