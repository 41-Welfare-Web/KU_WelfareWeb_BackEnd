import { Test, TestingModule } from '@nestjs/testing';
import { RentalsService } from './rentals.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigurationsService } from '../configurations/configurations.service';
import { HolidaysService } from '../holidays/holidays.service';
import { SmsService } from '../sms/sms.service';
import { CartService } from '../cart/cart.service';
import { RentalStatus, Role } from '@prisma/client';
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
    $queryRaw: jest.fn().mockResolvedValue([]),
    rentalItemInstance: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    item: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
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
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    rentalHistory: {
      create: jest.fn(),
    },
    itemInstance: {
      update: jest.fn(),
      findMany: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
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
    jest.clearAllMocks();
    mockHolidaysService.isHoliday.mockResolvedValue(false);
    mockPrisma.user.findFirst.mockResolvedValue({
      id: 'user-uuid',
      name: '테스터',
      phoneNumber: '01012341234',
      departmentType: '학과',
      departmentName: '컴퓨터공학과',
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RentalsService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: ConfigurationsService,
          useValue: {
            getValue: jest.fn().mockImplementation((key, defaultVal) => {
              if (key === 'rental_max_duration_days')
                return Promise.resolve('15');
              return Promise.resolve(defaultVal || '2');
            }),
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

    await service.create(userId, dto, userId, Role.USER);

    // 검증: rental.create가 호출될 때 department 정보와 rentalItems가 포함되어야 함
    expect(mockPrisma.rental.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          departmentType: '학과',
          departmentName: '컴퓨터공학과',
          rentalItems: {
            create: [
              { itemId: 1, quantity: 1, status: RentalStatus.RESERVED },
              { itemId: 2, quantity: 1, status: RentalStatus.RESERVED },
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
            rental: {
              startDate: getFutureWeekday(5),
              endDate: getFutureWeekday(7),
            },
          },
        ]);
      }
      return Promise.resolve([]);
    });

    await expect(
      service.create(userId, dto, userId, Role.USER),
    ).rejects.toThrow(
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
      id: 1,
      name: '테스트물품',
      totalQuantity: 5,
      components: [],
    });
    mockPrisma.rentalItem.findMany.mockResolvedValue([]);
    mockPrisma.rental.create.mockResolvedValue({
      id: 200,
      user: { phoneNumber: '01012341234', name: '테스터' },
      rentalItems: [{ item: { name: '테스트물품' } }],
    });

    await expect(
      service.create(
        userId,
        {
          departmentType: '학과',
          items: [{ itemId: 1, quantity: 1, startDate: start, endDate: end }],
        },
        adminId,
        Role.ADMIN,
      ),
    ).resolves.toBeDefined();
    expect(mockPrisma.rental.create).toHaveBeenCalled();
  });

  it('[User] 일반 사용자는 과거 날짜로 예약 불가', async () => {
    const userId = 'user-uuid';
    const start = getPastWeekdayStr(5);
    const end = getPastWeekdayStr(3);

    await expect(
      service.create(
        userId,
        {
          departmentType: '학과',
          items: [{ itemId: 1, quantity: 1, startDate: start, endDate: end }],
        },
        userId,
        Role.USER,
      ),
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
      id: 1,
      name: '테스트물품',
      totalQuantity: 5,
      components: [],
    });
    mockPrisma.rentalItem.findMany.mockResolvedValue([]);
    mockPrisma.rental.create.mockResolvedValue({
      id: 201,
      user: { phoneNumber: '01012341234', name: '테스터' },
      rentalItems: [{ item: { name: '테스트물품' } }],
    });

    await expect(
      service.create(
        userId,
        {
          departmentType: '학과',
          items: [{ itemId: 1, quantity: 1, startDate: start, endDate: end }],
        },
        adminId,
        Role.ADMIN,
      ),
    ).resolves.toBeDefined();
  });

  it('[User] 일반 사용자는 휴무일에 예약 불가', async () => {
    const userId = 'user-uuid';
    mockHolidaysService.isHoliday.mockResolvedValue(true);

    const start = toDateStr(getFutureWeekday(5));
    const end = toDateStr(getFutureWeekday(7));

    await expect(
      service.create(
        userId,
        {
          departmentType: '학과',
          items: [{ itemId: 1, quantity: 1, startDate: start, endDate: end }],
        },
        userId,
        Role.USER,
      ),
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
      startDate: new Date(toDateStr(getFutureWeekday(1))),
      endDate: new Date(toDateStr(getFutureWeekday(2))),
      departmentType: '학과',
      departmentName: null,
      rentalItems: [],
    });
    mockPrisma.item.findFirst.mockResolvedValue({
      id: 1,
      name: '테스트물품',
      totalQuantity: 5,
      components: [],
    });
    mockPrisma.rentalItem.findMany.mockResolvedValue([]);
    mockPrisma.rentalItem.deleteMany.mockResolvedValue({});
    mockPrisma.rental.update.mockResolvedValue({ id: 99 });

    await expect(
      service.update(
        99,
        '',
        {
          items: [
            { itemId: 1, quantity: 1, startDate: newStart, endDate: newEnd },
          ],
        },
        adminId,
        Role.ADMIN,
      ),
    ).resolves.toBeDefined();
  });

  // ─────────────────────────────────────────────────────────────────────────

  // ── RentalItem.status 개별/일괄 변경 테스트 ───────────────────────────────

  it('[DEFECTIVE] 특정 RentalItem만 DEFECTIVE로 변경됨 (재고/실물 상태는 건드리지 않음)', async () => {
    const rental = {
      id: 10,
      userId: 'user-uuid',
      rentalItems: [
        {
          id: 1,
          item: { name: '카메라' },
          status: RentalStatus.RENTED,
          instanceId: 50,
        },
      ],
      user: {
        phoneNumber: '01012341234',
        name: '테스터',
        departmentType: '학과',
        departmentName: null,
        id: 'user-uuid',
        username: 'tester',
        studentId: '20200001',
        role: 'USER',
        createdAt: new Date(),
      },
    };

    mockPrisma.rental.findFirst.mockResolvedValue(rental);
    mockPrisma.rentalItem.update.mockResolvedValue({
      id: 1,
      status: RentalStatus.DEFECTIVE,
    });
    mockPrisma.rentalItem.findMany.mockResolvedValue([
      { id: 1, status: RentalStatus.DEFECTIVE },
    ]);
    mockPrisma.rental.update.mockResolvedValue({});
    mockPrisma.rentalHistory.create.mockResolvedValue({});

    await service.updateStatus(10, 'admin-uuid', {
      status: RentalStatus.DEFECTIVE,
      rentalItemId: 1,
    });

    // RentalItem.update가 DEFECTIVE 상태로 호출되었는지 검증
    expect(mockPrisma.rentalItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: { status: RentalStatus.DEFECTIVE },
      }),
    );

    // 재고 차감 로직 제거(a9cdaca): 실물/재고는 건드리지 않아야 함
    expect(mockPrisma.itemInstance.update).not.toHaveBeenCalled();
    expect(mockPrisma.item.update).not.toHaveBeenCalled();
  });

  it('[DEFECTIVE] 개별 변경 후 rentals.status가 deriveRentalStatus로 재계산됨', async () => {
    const rental = {
      id: 11,
      userId: 'user-uuid',
      rentalItems: [
        {
          id: 2,
          itemId: 10,
          quantity: 2,
          item: { name: '의자' },
          status: RentalStatus.RENTED,
          instanceId: null,
        },
        {
          id: 3,
          itemId: 11,
          quantity: 1,
          item: { name: '천막' },
          status: RentalStatus.RENTED,
          instanceId: null,
        },
      ],
      user: {
        phoneNumber: '01012341234',
        name: '테스터',
        departmentType: '학과',
        departmentName: null,
        id: 'user-uuid',
        username: 'tester',
        studentId: '20200001',
        role: 'USER',
        createdAt: new Date(),
      },
    };

    mockPrisma.rental.findFirst.mockResolvedValue(rental);
    mockPrisma.rentalItem.update.mockResolvedValue({
      id: 2,
      status: RentalStatus.DEFECTIVE,
    });
    // 변경 후 상태: DEFECTIVE 1개 + RENTED 1개 → 대표 상태는 RENTED
    mockPrisma.rentalItem.findMany.mockResolvedValue([
      { id: 2, status: RentalStatus.DEFECTIVE },
      { id: 3, status: RentalStatus.RENTED },
    ]);
    mockPrisma.rental.update.mockResolvedValue({});
    mockPrisma.rentalHistory.create.mockResolvedValue({});

    await service.updateStatus(11, 'admin-uuid', {
      status: RentalStatus.DEFECTIVE,
      rentalItemId: 2,
    });

    // rentals.status 동기화: RENTED가 남아있으므로 대표 상태 RENTED
    expect(mockPrisma.rental.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 11 },
        data: { status: RentalStatus.RENTED },
      }),
    );
  });

  it('[개별 품목 RETURNED] 특정 rentalItem만 RETURNED 처리 시 나머지는 유지됨', async () => {
    const rental = {
      id: 13,
      userId: 'user-uuid',
      rentalItems: [
        {
          id: 7,
          itemId: 1,
          quantity: 1,
          item: { name: '노트북' },
          status: RentalStatus.RENTED,
          instanceId: null,
        },
        {
          id: 8,
          itemId: 2,
          quantity: 1,
          item: { name: '마우스' },
          status: RentalStatus.RENTED,
          instanceId: null,
        },
      ],
      user: {
        phoneNumber: '01012341234',
        name: '테스터',
        departmentType: '학과',
        departmentName: null,
        id: 'user-uuid',
        username: 'tester',
        studentId: '20200001',
        role: 'USER',
        createdAt: new Date(),
      },
    };

    mockPrisma.rental.findFirst.mockResolvedValue(rental);
    mockPrisma.rentalItem.update.mockResolvedValue({});
    mockPrisma.rentalHistory.create.mockResolvedValue({});

    await service.updateStatus(13, 'admin-uuid', {
      status: RentalStatus.RETURNED,
      rentalItemId: 7,
    });

    // 7번만 RETURNED 처리
    expect(mockPrisma.rentalItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 7 },
        data: { status: RentalStatus.RETURNED },
      }),
    );
    // 8번은 update 호출되지 않음
    expect(mockPrisma.rentalItem.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 8 } }),
    );
  });

  it('[일괄 상태변경] updateStatus 시 모든 rentalItem이 같은 status로 호출됨', async () => {
    const rental = {
      id: 20,
      userId: 'user-uuid',
      rentalItems: [
        { id: 5, item: { name: '노트북' }, status: RentalStatus.RESERVED },
        { id: 6, item: { name: '마우스' }, status: RentalStatus.RESERVED },
      ],
      user: {
        phoneNumber: '01012341234',
        name: '테스터',
        departmentType: '학과',
        departmentName: null,
        id: 'user-uuid',
        username: 'tester',
        studentId: '20200001',
        role: 'USER',
        createdAt: new Date(),
      },
    };

    mockPrisma.rental.findFirst.mockResolvedValue(rental);
    mockPrisma.rentalItem.update.mockResolvedValue({});
    mockPrisma.rentalHistory.create.mockResolvedValue({});

    await service.updateStatus(20, 'admin-uuid', {
      status: RentalStatus.RENTED,
    });

    // 각 rentalItem에 대해 update가 RENTED로 호출되었는지 검증
    expect(mockPrisma.rentalItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 5 },
        data: { status: RentalStatus.RENTED },
      }),
    );
    expect(mockPrisma.rentalItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 6 },
        data: { status: RentalStatus.RENTED },
      }),
    );
  });

  // ─────────────────────────────────────────────────────────────────────────

  it('should process overdue rental items and send SMS at 9 AM', async () => {
    const overdueItem = {
      id: 501,
      rentalId: 500,
      status: RentalStatus.RENTED,
      rental: {
        id: 500,
        userId: 'user-1',
        endDate: new Date('2026-02-01'), // 과거 날짜
        user: { name: '연체자', phoneNumber: '01011112222' },
      },
      item: { name: '노트북' },
    };

    mockPrisma.rentalItem.findMany.mockResolvedValue([overdueItem]);
    mockPrisma.rentalItem.update.mockResolvedValue({
      ...overdueItem,
      status: RentalStatus.OVERDUE,
    });
    mockPrisma.rentalHistory.create.mockResolvedValue({});

    await service.handleOverdueRentals();

    // 검증: Item 상태가 OVERDUE로 업데이트되었는지
    expect(mockPrisma.rentalItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 501 },
        data: { status: RentalStatus.OVERDUE },
      }),
    );

    // 검증: 연체 안내 SMS가 발송되었는지
    expect(mockSmsService.sendSMS).toHaveBeenCalledWith(
      '01011112222',
      expect.stringContaining('현재 연체 상태이오니 즉시 반납 부탁드립니다.'),
    );
  });
  // ===== 개별 실물 배정 (천막 출고) =====
  describe('updateStatus - 개별 실물 배정', () => {
    const TENT_ITEM_ID = 1;
    const RENTAL_ID = 600;
    const RENTAL_ITEM_ID = 61;

    // 천막 3동을 신청한 예약 건
    const buildRental = (quantity = 3, status = RentalStatus.RESERVED) => ({
      id: RENTAL_ID,
      deletedAt: null,
      memo: null,
      startDate: new Date(),
      endDate: new Date(),
      user: {
        id: 'user-uuid',
        name: '김민서',
        phoneNumber: '01011112222',
      },
      rentalItems: [
        {
          id: RENTAL_ITEM_ID,
          itemId: TENT_ITEM_ID,
          quantity,
          status,
          item: { id: TENT_ITEM_ID, name: '천막' },
        },
      ],
    });

    const instance = (
      id: number,
      serialNumber: string,
      status = 'AVAILABLE',
    ) => ({
      id,
      itemId: TENT_ITEM_ID,
      serialNumber,
      status,
      deletedAt: null,
    });

    // 실제 prisma처럼 요청한 id만 돌려주는 mock (where 조건 반영)
    const stockInstances = (list: any[]) =>
      mockPrisma.itemInstance.findMany.mockImplementation(({ where }: any) =>
        Promise.resolve(list.filter((i) => where.id.in.includes(i.id))),
      );

    beforeEach(() => {
      mockPrisma.rental.findFirst.mockResolvedValue(buildRental());
      stockInstances([
        instance(1, '천막 1'),
        instance(2, '천막 2'),
        instance(3, '천막 3'),
      ]);
      mockPrisma.rentalItemInstance.findMany.mockResolvedValue([]); // 점유 없음
      mockPrisma.rentalItemInstance.deleteMany.mockResolvedValue({});
      mockPrisma.rentalItemInstance.createMany.mockResolvedValue({});
      mockPrisma.rentalItem.update.mockResolvedValue({});
      mockPrisma.rentalItem.findMany.mockResolvedValue([
        { id: RENTAL_ITEM_ID, status: RentalStatus.RENTED },
      ]);
      mockPrisma.rental.update.mockResolvedValue({});
      mockPrisma.rentalHistory.create.mockResolvedValue({});
    });

    it('신청 수량만큼 출고하면 실물이 배정되고 수량은 그대로다', async () => {
      await service.updateStatus(RENTAL_ID, 'admin-uuid', {
        status: RentalStatus.RENTED,
        rentalItemId: RENTAL_ITEM_ID,
        instanceIds: [1, 2, 3],
      });

      expect(mockPrisma.rentalItemInstance.createMany).toHaveBeenCalledWith({
        data: [
          { rentalItemId: RENTAL_ITEM_ID, instanceId: 1 },
          { rentalItemId: RENTAL_ITEM_ID, instanceId: 2 },
          { rentalItemId: RENTAL_ITEM_ID, instanceId: 3 },
        ],
      });
      // 출고 수량이 신청 수량과 같으므로 그대로 유지
      expect(mockPrisma.rentalItem.update).toHaveBeenCalledWith({
        where: { id: RENTAL_ITEM_ID },
        data: { status: RentalStatus.RENTED, quantity: 3 },
      });
    });

    it('부분 출고하면 같은 트랜잭션에서 수량도 함께 줄어든다', async () => {
      await service.updateStatus(RENTAL_ID, 'admin-uuid', {
        status: RentalStatus.RENTED,
        rentalItemId: RENTAL_ITEM_ID,
        instanceIds: [1, 2],
      });

      expect(mockPrisma.rentalItem.update).toHaveBeenCalledWith({
        where: { id: RENTAL_ITEM_ID },
        data: { status: RentalStatus.RENTED, quantity: 2 },
      });
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('동시 배정을 막기 위해 실물 행을 잠근다 (FOR UPDATE)', async () => {
      await service.updateStatus(RENTAL_ID, 'admin-uuid', {
        status: RentalStatus.RENTED,
        rentalItemId: RENTAL_ITEM_ID,
        instanceIds: [1],
      });

      expect(mockPrisma.$queryRaw).toHaveBeenCalled();
      const sql = mockPrisma.$queryRaw.mock.calls[0][0].join('');
      expect(sql).toContain('FOR UPDATE');
    });

    it('다른 대여 건이 이미 들고 나간 실물이면 409로 막는다', async () => {
      mockPrisma.rentalItemInstance.findMany.mockResolvedValue([
        {
          instanceId: 2,
          itemInstance: { serialNumber: '천막 2' },
          rentalItem: { rentalId: 555 },
        },
      ]);

      await expect(
        service.updateStatus(RENTAL_ID, 'admin-uuid', {
          status: RentalStatus.RENTED,
          rentalItemId: RENTAL_ITEM_ID,
          instanceIds: [1, 2],
        }),
      ).rejects.toThrow(ConflictException);

      expect(mockPrisma.rentalItemInstance.createMany).not.toHaveBeenCalled();
    });

    it('파손된 실물은 출고할 수 없다', async () => {
      stockInstances([instance(1, '천막 1'), instance(2, '천막 2', 'BROKEN')]);

      await expect(
        service.updateStatus(RENTAL_ID, 'admin-uuid', {
          status: RentalStatus.RENTED,
          rentalItemId: RENTAL_ITEM_ID,
          instanceIds: [1, 2],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('다른 물품의 실물은 배정할 수 없다', async () => {
      stockInstances([
        instance(1, '천막 1'),
        {
          id: 99,
          itemId: 42,
          serialNumber: '의자 1',
          status: 'AVAILABLE',
          deletedAt: null,
        },
      ]);

      await expect(
        service.updateStatus(RENTAL_ID, 'admin-uuid', {
          status: RentalStatus.RENTED,
          rentalItemId: RENTAL_ITEM_ID,
          instanceIds: [1, 99],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('신청 수량보다 많이 출고할 수 없다', async () => {
      mockPrisma.rental.findFirst.mockResolvedValue(buildRental(2));

      await expect(
        service.updateStatus(RENTAL_ID, 'admin-uuid', {
          status: RentalStatus.RENTED,
          rentalItemId: RENTAL_ITEM_ID,
          instanceIds: [1, 2, 3],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rentalItemId 없이 instanceIds만 보내면 거부한다', async () => {
      await expect(
        service.updateStatus(RENTAL_ID, 'admin-uuid', {
          status: RentalStatus.RENTED,
          instanceIds: [1],
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('대여중(RENTED)이 아닌 상태 변경에는 instanceIds를 쓸 수 없다', async () => {
      await expect(
        service.updateStatus(RENTAL_ID, 'admin-uuid', {
          status: RentalStatus.RETURNED,
          rentalItemId: RENTAL_ITEM_ID,
          instanceIds: [1],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('예약으로 되돌리면 배정이 해제된다', async () => {
      mockPrisma.rental.findFirst.mockResolvedValue(
        buildRental(3, RentalStatus.RENTED),
      );

      await service.updateStatus(RENTAL_ID, 'admin-uuid', {
        status: RentalStatus.RESERVED,
        rentalItemId: RENTAL_ITEM_ID,
      });

      expect(mockPrisma.rentalItemInstance.deleteMany).toHaveBeenCalledWith({
        where: { rentalItemId: RENTAL_ITEM_ID },
      });
    });

    it('반납 처리 시에는 배정 이력을 남겨둔다', async () => {
      mockPrisma.rental.findFirst.mockResolvedValue(
        buildRental(3, RentalStatus.RENTED),
      );

      await service.updateStatus(RENTAL_ID, 'admin-uuid', {
        status: RentalStatus.RETURNED,
        rentalItemId: RENTAL_ITEM_ID,
      });

      expect(mockPrisma.rentalItemInstance.deleteMany).not.toHaveBeenCalled();
    });
  });
});
