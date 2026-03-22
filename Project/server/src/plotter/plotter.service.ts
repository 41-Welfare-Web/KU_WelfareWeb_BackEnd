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
import { getStartOfDayKst, parseDateOnlyKst, getNowKst } from '../common/utils/date.util';

@Injectable()
export class PlotterService {
  constructor(
    private prisma: PrismaService,
    private filesService: FilesService,
    private configService: ConfigurationsService,
    private holidaysService: HolidaysService,
    private smsService: SmsService,
  ) {}

  public async getMetadata() {
    // 1. 소속 목록 파싱 로직
    const typeString = await this.configService.getValue('plotter_departments_list', '');
    const types = typeString ? typeString.split(',').map((t) => t.trim()) : [];

    const original2DArray = await Promise.all(
      types.map(async (type) => {
        if (!type) return [];
        const namesString = await this.configService.getValue(`dept_list_${type}`, '');
        return namesString ? namesString.split(',').map((n) => n.trim()) : [type];
      }),
    );

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
        (mainCategory.endsWith('대학') || mainCategory.endsWith('과학원') || mainCategory.endsWith('기술원'))
      ) {
        collegeOptions.push(mainCategory);
        departmentOptions.push(...subCategories);
      } else if (
        subCategories.length === 0 &&
        (mainCategory.endsWith('대학') || mainCategory.endsWith('과학원') || mainCategory.endsWith('기술원'))
      ) {
        collegeOptions.push(mainCategory);
      }
    });

    const departments = [
      { category: '중앙자치기구', requiresInput: false, options: centralAutonomousOptions },
      { category: '단과대 학생회', requiresInput: false, options: collegeOptions.map((c) => `${c} 학생회`) },
      { category: '학과 학생회', requiresInput: false, options: departmentOptions.map((d) => `${d} 학생회`) },
      { category: '중앙동아리', requiresInput: true, placeholder: '동아리 이름을 입력하세요' },
      { category: '단과대동아리', requiresInput: true, placeholder: '동아리 이름을 입력하세요' },
      { category: '학과동아리', requiresInput: true, placeholder: '동아리 이름을 입력하세요' },
      { category: '기타', requiresInput: true, placeholder: '소속명을 직접 입력하세요' },
    ];

    // 2. 가격 및 목적 설정 조회
    const purposesStr = await this.configService.getValue('plotter_purposes', '');
    const freePurposesStr = await this.configService.getValue('plotter_free_purposes', '');
    const freeDeptsStr = await this.configService.getValue('plotter_free_departments', '');
    const priceA0 = await this.configService.getValue('plotter_price_a0', '2000');
    const priceA1 = await this.configService.getValue('plotter_price_a1', '1500');

    return {
      departments,
      purposes: purposesStr ? purposesStr.split(',').map((p) => p.trim()) : [],
      freePurposes: freePurposesStr ? freePurposesStr.split(',').map((p) => p.trim()) : [],
      freeDepartments: freeDeptsStr ? freeDeptsStr.split(',').map((d) => d.trim()) : [],
      prices: {
        a0: parseInt(priceA0, 10),
        a1: parseInt(priceA1, 10),
      },
    };
  }

  async calculateEstimatedPrice(dto: PlotterPriceCheckDto, userId: string) {
    const { purpose, paperSize, pageCount, orderQuantity } = dto;

    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    const metadata = await this.getMetadata();
    const unitPrice = paperSize.toLowerCase() === 'a0' ? metadata.prices.a0 : metadata.prices.a1;

    const totalSheets = Number(pageCount) * Number(orderQuantity || 1);
    let totalPrice = unitPrice * totalSheets;

    const normalizedPurpose = purpose.replace(/\s+/g, '');
    const isFreePurpose = metadata.freePurposes.some(freePurpose => {
      const normalizedFreePurpose = freePurpose.replace(/\s+/g, '');
      return normalizedPurpose.includes(normalizedFreePurpose) || normalizedFreePurpose.includes(normalizedPurpose);
    });

    let message = `인쇄 비용은 총 ${totalPrice.toLocaleString()}원입니다.`;

    if (isFreePurpose) {
      totalPrice = 0;
      message = `[무료 대상] '${purpose}' 목적은 무료 인쇄 지원 대상입니다.`;
    } else {
      message += ` (총 ${totalPrice.toLocaleString()}원) 입금 확인증 업로드가 필요합니다.`;
    }

    return {
      price: totalPrice,
      totalSheets,
      isFree: totalPrice === 0,
      message,
    };
  }

  async create(
    userId: string,
    createOrderDto: CreatePlotterOrderDto,
    pdfFile: Express.Multer.File | undefined,
    receiptFile: Express.Multer.File | undefined,
    actorId?: string,
  ) {
    if (!pdfFile) throw new BadRequestException('PDF 파일이 필요합니다.');
    if (pdfFile.mimetype !== 'application/pdf') throw new BadRequestException('PDF 파일만 업로드 가능합니다.');

    const header = pdfFile.buffer.slice(0, 5).toString();
    if (header !== '%PDF-') throw new BadRequestException('유효하지 않은 PDF 형식입니다.');

    const {
      purpose: rawPurpose,
      paperSize: rawPaperSize,
      pageCount: rawPageCount,
      orderQuantity: rawOrderQuantity,
      departmentType: rawDeptType,
      departmentName: rawDeptName,
      pickupDate: requestedPickupDate,
    } = createOrderDto;

    const purpose = rawPurpose.replace(/['"]/g, '').trim();
    const paperSize = rawPaperSize.replace(/['"]/g, '').trim();
    const departmentType = rawDeptType.replace(/['"]/g, '').trim();
    const departmentName = (rawDeptName || '').replace(/['"]/g, '').trim();
    const pageCount = Number(rawPageCount);
    const orderQuantity = Number(rawOrderQuantity || 1);

    const { price: totalPrice } = await this.calculateEstimatedPrice(
      { purpose, paperSize, pageCount, orderQuantity, departmentType, departmentName },
      userId,
    );

    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    const isPaid = totalPrice > 0;
    if (isPaid && !receiptFile && !actorId) {
      throw new BadRequestException(`해당 주문은 유료 서비스(${totalPrice}원)입니다. 입금 내역 이미지를 업로드해주세요.`);
    }

    const fileUrl = await this.filesService.uploadFile(pdfFile, 'plotter/pdfs');
    const paymentReceiptUrl = receiptFile
      ? await this.filesService.uploadFile(receiptFile, 'plotter/receipts')
      : null;

    const delayDaysStr = await this.configService.getValue('plotter_pickup_delay_days', '2');
    const delayDays = parseInt(delayDaysStr, 10);
    const nowKst = getStartOfDayKst();
    const minPickupDate = await this.holidaysService.calculateBusinessDate(nowKst, delayDays);
    const pickupDate = parseDateOnlyKst(requestedPickupDate);

    if (pickupDate < minPickupDate) {
      const minDateStr = minPickupDate.toISOString().split('T')[0];
      throw new BadRequestException(`수령 희망 일자가 너무 빠릅니다. 최소 ${delayDays}근무일 이후인 ${minDateStr}부터 가능합니다.`);
    }

    if (await this.holidaysService.isHoliday(pickupDate)) {
      throw new BadRequestException('수령 희망 일자가 휴무일입니다. 다른 날짜를 선택해주세요.');
    }

    const order = await this.prisma.plotterOrder.create({
      data: {
        userId,
        purpose,
        paperSize,
        departmentType,
        departmentName: departmentName || null,
        pageCount,
        orderQuantity,
        isPaidService: isPaid,
        price: totalPrice,
        fileUrl,
        originalFilename: pdfFile.originalname,
        fileSize: pdfFile.size,
        paymentReceiptUrl,
        pickupDate,
        status: PlotterStatus.PENDING,
        plotterOrderHistories: {
          create: {
            changedBy: actorId || userId,
            oldStatus: null,
            newStatus: PlotterStatus.PENDING,
            memo: actorId ? '관리자 대리 주문 생성' : '플로터 주문 신청',
          },
        },
      },
      include: {
        user: { select: { name: true, studentId: true, departmentType: true, departmentName: true } },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: actorId || userId,
        action: 'CREATE_PLOTTER_ORDER',
        targetType: 'PLOTTER_ORDER',
        targetId: String(order.id),
        details: { price: totalPrice, isPaidService: isPaid },
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
      where.status = status as PlotterStatus;
    }

    const [orders, total] = await this.prisma.$transaction([
      this.prisma.plotterOrder.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true, studentId: true, phoneNumber: true } } },
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

    if (order.userId !== userId) throw new ForbiddenException('권한이 없습니다.');

    if (order.status !== PlotterStatus.PENDING) {
      throw new BadRequestException('주문 대기 상태일 때만 취소할 수 있습니다.');
    }

    const memo = `사용자 직접 취소 (주문 시 소속: ${order.departmentType}${order.departmentName ? ' / ' + order.departmentName : ''})`;

    await this.prisma.$transaction([
      this.prisma.plotterOrder.update({
        where: { id },
        data: {
          deletedAt: getNowKst(),
          plotterOrderHistories: {
            create: {
              changedBy: userId,
              oldStatus: order.status,
              newStatus: 'CANCELED',
              memo: memo,
            },
          },
        },
      }),
      this.prisma.auditLog.create({
        data: {
          userId,
          action: 'CANCEL_PLOTTER_ORDER',
          targetType: 'PLOTTER_ORDER',
          targetId: String(id),
        },
      }),
    ]);

    return { message: '주문이 취소되었습니다.' };
  }

  async updateStatus(
    id: number,
    adminId: string,
    status: string,
    rejectionReason?: string,
    memo?: string,
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
        rejectionReason: status === PlotterStatus.REJECTED ? rejectionReason : null,
        memo: memo ?? order.memo,
        plotterOrderHistories: {
          create: {
            changedBy: adminId,
            oldStatus: order.status,
            newStatus: status,
            memo: memo || rejectionReason || `상태 변경: ${status}`,
          },
        },
      },
      include: {
        user: {
          select: { id: true, username: true, name: true, studentId: true, phoneNumber: true, departmentType: true, departmentName: true, role: true, createdAt: true },
        },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'UPDATE_PLOTTER_STATUS',
        targetType: 'PLOTTER_ORDER',
        targetId: String(id),
        details: { oldStatus: order.status, newStatus: status, rejectionReason },
      },
    });

    try {
      await this.smsService.sendPlotterStatusNotice(
        updated.user.phoneNumber,
        updated.user.name,
        status,
        rejectionReason,
      );
    } catch (smsError) {
      console.error('[PlotterService] 상태 변경 SMS 알림 실패 (무시):', smsError.message);
    }

    return updated;
  }
}
