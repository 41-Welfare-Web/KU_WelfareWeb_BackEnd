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

  // 플로터 관련 메타데이터 조회 (MetaData API와 검증 로직에서 공통 사용)
  async getMetadata() {
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
    const freePurposesStr = await this.configService.getValue('plotter_free_purposes', '예산안 출력, 회칙 인쇄, 행사 홍보');
    
    // 공식 무료 대상 소속 리스트 (MetaData API의 category 및 options 명칭 기준)
    const freeDeptsStr = await this.configService.getValue(
      'plotter_free_departments', 
      '학과 학생회, 단과대 학생회, 중앙자치기구, 중앙동아리, 총학생회'
    );
    
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

  // 가격 및 무료 여부 계산 (공통 로직)
  async calculateEstimatedPrice(dto: PlotterPriceCheckDto, userId: string) {
    const { purpose, paperSize, pageCount, departmentType: dtoDeptType } = dto;

    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    // DTO에 소속 유형이 있으면 그것을 쓰고(프론트엔드 선택값), 없으면 DB의 사용자 기본 소속 사용
    const departmentType = dtoDeptType || user.departmentType;

    // 중앙 집중화된 메타데이터를 사용하여 가격 및 무료 조건 판정
    const metadata = await this.getMetadata();

    const unitPrice = paperSize.toLowerCase() === 'a0' ? metadata.prices.a0 : metadata.prices.a1;
    let totalPrice = unitPrice * Number(pageCount);

    // MetaData API에서 내려주는 값과 100% 동일한 기준으로 검증
    // 1. 소속 검증: 입력된 소속명이 무료 대상 소속 리스트에 포함되는지 확인 (공백 제거 후 비교)
    const normalizedDept = departmentType.replace(/\s+/g, '');
    const isFreeDept = metadata.freeDepartments.some(freeDept => {
      const normalizedFreeDept = freeDept.replace(/\s+/g, '');
      return normalizedDept.includes(normalizedFreeDept) || normalizedFreeDept.includes(normalizedDept);
    });

    // 2. 목적 검증: 입력된 목적이 무료 목적 리스트에 포함되는지 확인 (공백 제거 후 비교)
    const normalizedPurpose = purpose.replace(/\s+/g, '');
    const isFreePurpose = metadata.freePurposes.some(freePurpose => {
      const normalizedFreePurpose = freePurpose.replace(/\s+/g, '');
      return normalizedPurpose.includes(normalizedFreePurpose) || normalizedFreePurpose.includes(normalizedPurpose);
    });

    let message = `인쇄 비용은 총 ${totalPrice.toLocaleString()}원입니다.`;
    
    // 최종 무료 판정: 소속과 목적이 모두 무료 조건(MetaData)에 부합해야 함
    if (isFreeDept && isFreePurpose) {
      totalPrice = 0;
      message = `[무료 대상] '${departmentType}' 소속 및 '${purpose}' 목적은 무료 인쇄 지원 대상입니다.`;
    } else {
      message += ` (총 ${totalPrice.toLocaleString()}원) 입금 확인증 업로드가 필요합니다.`;
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

    const {
      purpose: rawPurpose,
      paperSize: rawPaperSize,
      pageCount: rawPageCount,
      departmentType: rawDeptType,
      departmentName: rawDeptName,
      pickupDate: requestedPickupDate,
    } = createOrderDto;

    // multipart/form-data 특성상 섞일 수 있는 불필요한 따옴표나 양끝 공백 제거
    const purpose = rawPurpose.replace(/['"]/g, '').trim();
    const paperSize = rawPaperSize.replace(/['"]/g, '').trim();
    const departmentType = rawDeptType.replace(/['"]/g, '').trim();
    const departmentName = (rawDeptName || '').replace(/['"]/g, '').trim();
    const pageCount = Number(rawPageCount);

    // 3. 가격 계산 및 유/무료 판별 로직 호출 (정제된 데이터 전달)
    const { price: totalPrice } = await this.calculateEstimatedPrice(
      {
        purpose,
        paperSize,
        pageCount,
        departmentType,
        departmentName,
      },
      userId,
    );

    // 사용자 정보 조회 (SMS 발송 등에 필요)
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

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

    // 근무일 최소 수령 가능일 계산 (Config 활용)
    const delayDaysStr = await this.configService.getValue(
      'plotter_pickup_delay_days',
      '2',
    );
    const delayDays = parseInt(delayDaysStr, 10);

    // KST 기준 현재 날짜 (서버 로컬 시간에 영향받지 않도록)
    const nowKst = new Date(
      new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }),
    );
    nowKst.setHours(0, 0, 0, 0);

    const minPickupDate = await this.holidaysService.calculateBusinessDate(
      nowKst,
      delayDays,
    );

    // 사용자가 입력한 날짜를 서버 타임존과 관계없이 순수 날짜 숫자로 보존하기 위해 UTC 00:00:00으로 설정
    // 이렇게 하면 DB에 저장될 때 해당 날짜가 그대로 유지됨
    const pickupDateStr = requestedPickupDate.split('T')[0];
    const pickupDate = new Date(`${pickupDateStr}T00:00:00.000Z`);

    if (pickupDate < minPickupDate) {
      const minDateStr = minPickupDate.toISOString().split('T')[0];
      throw new BadRequestException(
        `수령 희망 일자가 너무 빠릅니다. 최소 ${delayDays}근무일 이후인 ${minDateStr}부터 가능합니다.`,
      );
    }

    if (await this.holidaysService.isHoliday(pickupDate)) {
      throw new BadRequestException(
        '수령 희망 일자가 휴무일(주말 포함)입니다. 다른 날짜를 선택해주세요.',
      );
    }

    const order = await this.prisma.plotterOrder.create({
      data: {
        userId,
        purpose,
        paperSize,
        departmentType,
        departmentName: departmentName || null,
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
        user: {
          select: {
            name: true,
            studentId: true,
            departmentType: true,
            departmentName: true,
          },
        },
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

    const memo = `사용자 직접 취소 (주문 시 소속: ${order.departmentType}${order.departmentName ? ' / ' + order.departmentName : ''})`;

    await this.prisma.plotterOrder.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        plotterOrderHistories: {
          create: {
            changedBy: userId,
            oldStatus: order.status,
            newStatus: 'CANCELED',
            memo: memo,
          },
        },
      },
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
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            studentId: true,
            phoneNumber: true,
            departmentType: true,
            departmentName: true,
            role: true,
            createdAt: true,
          },
        },
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
      console.error(
        '[PlotterService] 상태 변경 SMS 알림 실패 (무시):',
        smsError.message,
      );
    }

    return updated;
  }
}
