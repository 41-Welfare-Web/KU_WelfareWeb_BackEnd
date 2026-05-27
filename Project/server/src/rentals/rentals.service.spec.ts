import { Test, TestingModule } from '@nestjs/testing';
import { RentalsService } from './rentals.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigurationsService } from '../configurations/configurations.service';
import { HolidaysService } from '../holidays/holidays.service';
import { SmsService } from '../sms/sms.service';
import { CartService } from '../cart/cart.service';
import { RentalStatus } from '@prisma/client';
import { BadRequestException, ConflictException } from '@nestjs/common';

// 날짜 헬퍼: n일 뒤 평일(월~금) 반환
function getFutureWeekday(daysFromNow: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

// 과거 평일 날짜 문자열 반환 (n일 전)
function getPastWeekdayStr(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() - 1);
  }
  return d.toISOString().split('T')[0];
}

describe('RentalsService', () => {
  let service: RentalsService;
  let _prisma: PrismaService;
  let smsService: SmsService;

  const mockPrisma = {
    $transaction: jest.fn((cb) => cb(mockPrisma)),
    item: {
      findFirst: jest.fn(),
    },
    rental: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
    },
    rentalItem: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    rentalHistory: {
      create: jest.fn(),
    },
    user: {
      findFirst: jest.fn().mockResolvedValue({
        id: 'user-uuid',
        name: '테스터',
        phoneNumber: '01012341234',
        departmentType: '학과',
        departmentName: '컴퓨터공학과',
      }),
    },
    cartItem: {
      deleteMany: jest.fn(),
    },
  };

  const mockSmsService = {
    sendRentalStatusNotice: jest.fn().mockResolvedValue(true),
    sendSMS: jest.fn().mockResolvedValue(true),
    sendReturnReminder: jest.fn().mockResolvedValue(true),
  };

  const mockHolidaysService = {
    isHoliday: jest.fn().mockResolvedValue(false),
  };

  beforeEach(async () => {
    mockHolidaysService.isHoliday.mockReset().mockResolvedValue(false);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RentalsService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: ConfigurationsService,
          useValue: {
            getValue: jest.fn().mockImplementation((key, defaultVal) => {
              if (key === 'rental_max_duration_days') return Promise.resolve('15');
              return Promise.resolve(defaultVal || '2');
            })
          },
        },
        { provide: HolidaysService, useValue: mockHolidaysService },
        { provide: SmsService, useValue: mockSmsService },
        {
          provide: CartService,
          useValue: { clearCart: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get<RentalsService>(RentalsService);
    _prisma = module.get<PrismaService>(PrismaService);
    smsService = module.get<SmsService>(SmsService);
  });

  it('should create a bundle rental automatically including components', async () => {
    const userId = 'user-uuid';
    const dto = {
      departmentType: '학과',
      departmentName: '컴퓨터공학과',
      items: [
        {
          itemId: 1,
          quantity: 1,
          startDate: toDateStr(getFutureWeekday(5)),
          endDate: toDateStr(getFutureWeekday(7)),
        },
      ],
    };

    // Mock: 메인 물품(ID: 1)은 구성품(ID: 2) 1개를 가지고 있음
    mockPrisma.item.findFirst.mockImplementation(({ where }) => {
      if (where.id === 1)
        return Promise.resolve({
          id: 1,
          name: '카메라',
          totalQuantity: 5,
          components: [{ componentId: 2, quantity: 1 }],
        });
      if (where.id === 2)
        return Promise.resolve({
          id: 2,
          name: '삼각대',
          totalQuantity: 5,
          components: [],
        });
      return Promise.resolve(null);
    });

    mockPrisma.rentalItem.findMany.mockResolvedValue([]); // 재고 넉넉함
    mockPrisma.rental.create.mockResolvedValue({
      id: 100,
      user: { phoneNumber: '01012341234', name: '테스터' },
      rentalItems: [{ item: { name: '카메라' } }],
    });

    await service.create(userId, dto);

    // 검증: rental.create가 호출될 때 department 정보와 rentalItems가 포함되어야 함
    expect(mockPrisma.rental.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          departmentType: '학과',
          departmentName: '컴퓨터공학과',
          rentalItems: {
            create: [
              { itemId: 1, quantity: 1 },
              { itemId: 2, quantity: 1 },
            ],
          },
        }),
      }),
    );
  });

  it('should throw ConflictException if a component stock is insufficient', async () => {
    const userId = 'user-uuid';
    const dto = {
      departmentType: '학과',
      departmentName: '컴퓨터공학과',
      items: [
        {
          itemId: 1,
          quantity: 1,
          startDate: toDateStr(getFutureWeekday(5)),
          endDate: toDateStr(getFutureWeekday(7)),
        },
      ],
    };

    // Mock: 카메라는 재고가 있으나 삼각대는 재고가 0인 상황
    mockPrisma.item.findFirst.mockImplementation(({ where }) => {
      if (where.id === 1)
        return Promise.resolve({
          id: 1,
          name: '카메라',
          totalQuantity: 5,
          components: [{ componentId: 2, quantity: 1 }],
        });
      if (where.id === 2)
        return Promise.resolve({
          id: 2,
          name: '삼각대',
          totalQuantity: 1,
          components: [],
        });
      return Promise.resolve(null);
    });

    // 삼각대(ID: 2)에 대해 이미 1개가 예약되어 있다고 설정
    mockPrisma.rentalItem.findMany.mockImplementation(({ where }) => {
      if (where.itemId === 2) {
        return Promise.resolve([
          {
            quantity: 1,
            rental: { startDate: getFutureWeekday(5), endDate: getFutureWeekday(7) },
          },
        ]);
      }
      return Promise.resolve([]);
    });

    await expect(service.create(userId, dto)).rejects.toThrow(
      new ConflictException("'삼각대'의 재고가 부족합니다. (가용 재고: 0)"),
    );
  });

  // ── 관리자 날짜·휴무일 제한 우회 테스트 ──────────────────────────────────

  it('[Admin] 관리자는 과거 날짜로 예약 생성 가능', async () => {
    const userId = 'user-uuid';
    const adminId = 'admin-uuid'; // actorId !== userId → isAdminAction = true

    const start = getPastWeekdayStr(5);
    const end = getPastWeekdayStr(3);

    mockPrisma.item.findFirst.mockResolvedValue({
      id: 1, name: '테스트물품', totalQuantity: 5, components: [],
    });
    mockPrisma.rentalItem.findMany.mockResolvedValue([]);
    mockPrisma.rental.create.mockResolvedValue({
      id: 200,
      user: { phoneNumber: '01012341234', name: '테스터' },
      rentalItems: [{ item: { name: '테스트물품' } }],
    });

    await expect(
      service.create(userId, { departmentType: '학과', items: [{ itemId: 1, quantity: 1, startDate: start, endDate: end }] }, adminId),
    ).resolves.toBeDefined();
    expect(mockPrisma.rental.create).toHaveBeenCalled();
  });

  it('[User] 일반 사용자는 과거 날짜로 예약 불가', async () => {
    const userId = 'user-uuid';
    const start = getPastWeekdayStr(5);
    const end = getPastWeekdayStr(3);

    await expect(
      service.create(userId, { departmentType: '학과', items: [{ itemId: 1, quantity: 1, startDate: start, endDate: end }] }, userId),
    ).rejects.toThrow(BadRequestException);
  });

  it('[Admin] 관리자는 휴무일에 예약 생성 가능', async () => {
    const userId = 'user-uuid';
    const adminId = 'admin-uuid';
    // isHoliday가 true를 반환하도록 설정 (모든 날짜가 휴무일)
    mockHolidaysService.isHoliday.mockResolvedValue(true);

    const start = toDateStr(getFutureWeekday(5));
    const end = toDateStr(getFutureWeekday(7));

    mockPrisma.item.findFirst.mockResolvedValue({
      id: 1, name: '테스트물품', totalQuantity: 5, components: [],
    });
    mockPrisma.rentalItem.findMany.mockResolvedValue([]);
    mockPrisma.rental.create.mockResolvedValue({
      id: 201,
      user: { phoneNumber: '01012341234', name: '테스터' },
      rentalItems: [{ item: { name: '테스트물품' } }],
    });

    await expect(
      service.create(userId, { departmentType: '학과', items: [{ itemId: 1, quantity: 1, startDate: start, endDate: end }] }, adminId),
    ).resolves.toBeDefined();
  });

  it('[User] 일반 사용자는 휴무일에 예약 불가', async () => {
    const userId = 'user-uuid';
    mockHolidaysService.isHoliday.mockResolvedValue(true);

    const start = toDateStr(getFutureWeekday(5));
    const end = toDateStr(getFutureWeekday(7));

    await expect(
      service.create(userId, { departmentType: '학과', items: [{ itemId: 1, quantity: 1, startDate: start, endDate: end }] }, userId),
    ).rejects.toThrow(BadRequestException);
  });

  it('[Admin] 관리자는 예약 수정 시 휴무일 체크 건너뜀', async () => {
    const adminId = 'admin-uuid';
    mockHolidaysService.isHoliday.mockResolvedValue(true);

    const newStart = toDateStr(getFutureWeekday(3));
    const newEnd = toDateStr(getFutureWeekday(5));

    // 기존 예약 mock
    mockPrisma.rental.findFirst.mockResolvedValue({
      id: 99,
      userId: 'user-uuid',
      status: RentalStatus.RESERVED,
      startDate: new Date(toDateStr(getFutureWeekday(1))),
      endDate: new Date(toDateStr(getFutureWeekday(2))),
      departmentType: '학과',
      departmentName: null,
      rentalItems: [],
    });
    mockPrisma.item.findFirst.mockResolvedValue({
      id: 1, name: '테스트물품', totalQuantity: 5, components: [],
    });
    mockPrisma.rentalItem.findMany.mockResolvedValue([]);
    mockPrisma.rentalItem.deleteMany.mockResolvedValue({});
    mockPrisma.rental.update.mockResolvedValue({ id: 99 });

    await expect(
      service.update(99, '', { items: [{ itemId: 1, quantity: 1, startDate: newStart, endDate: newEnd }] }, adminId),
    ).resolves.toBeDefined();
  });

  // ─────────────────────────────────────────────────────────────────────────

  it('should process overdue rentals and send SMS at 9 AM', async () => {
    const overdueRental = {
      id: 500,
      userId: 'user-1',
      status: RentalStatus.RENTED,
      endDate: new Date('2026-02-01'), // 과거 날짜
      user: { name: '연체자', phoneNumber: '01011112222' },
      rentalItems: [{ item: { name: '노트북' } }],
    };

    mockPrisma.rental.findMany.mockResolvedValue([overdueRental]);
    mockPrisma.rental.update.mockResolvedValue({
      ...overdueRental,
      status: RentalStatus.OVERDUE,
    });

    await service.handleOverdueRentals();

    // 검증: 상태가 OVERDUE로 업데이트되었는지
    expect(mockPrisma.rental.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 500 },
        data: expect.objectContaining({ status: RentalStatus.OVERDUE }),
      }),
    );

    // 검증: 연체 안내 SMS가 발송되었는지
    expect(mockSmsService.sendSMS).toHaveBeenCalledWith(
      '01011112222',
      expect.stringContaining('연체 상태이오니 즉시 반납 부탁드립니다.'),
    );
  });
});
