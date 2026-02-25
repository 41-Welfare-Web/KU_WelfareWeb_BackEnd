import { Test, TestingModule } from '@nestjs/testing';
import { RentalsService } from './rentals.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigurationsService } from '../configurations/configurations.service';
import { HolidaysService } from '../holidays/holidays.service';
import { SmsService } from '../sms/sms.service';
import { CartService } from '../cart/cart.service';
import { RentalStatus } from '@prisma/client';
import { BadRequestException, ConflictException } from '@nestjs/common';

describe('RentalsService', () => {
  let service: RentalsService;
  let prisma: PrismaService;
  let smsService: SmsService;

  const mockPrisma = {
    $transaction: jest.fn((cb) => cb(mockPrisma)),
    item: {
      findUnique: jest.fn(),
    },
    rental: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    rentalItem: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    rentalHistory: {
      create: jest.fn(),
    },
  };

  const mockSmsService = {
    sendRentalStatusNotice: jest.fn().mockResolvedValue(true),
    sendSMS: jest.fn().mockResolvedValue(true),
    sendReturnReminder: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RentalsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigurationsService, useValue: { getValue: jest.fn().mockResolvedValue('2') } },
        { provide: HolidaysService, useValue: { isHoliday: jest.fn().mockResolvedValue(false) } },
        { provide: SmsService, useValue: mockSmsService },
        { provide: CartService, useValue: { clearCart: jest.fn().mockResolvedValue(undefined) } },
      ],
    }).compile();

    service = module.get<RentalsService>(RentalsService);
    prisma = module.get<PrismaService>(PrismaService);
    smsService = module.get<SmsService>(SmsService);
  });

  it('should create a bundle rental automatically including components', async () => {
    const userId = 'user-uuid';
    const dto = {
      items: [{ itemId: 1, quantity: 1, startDate: '2026-03-01', endDate: '2026-03-03' }],
    };

    // Mock: 메인 물품(ID: 1)은 구성품(ID: 2) 1개를 가지고 있음
    mockPrisma.item.findUnique.mockImplementation(({ where }) => {
      if (where.id === 1) return Promise.resolve({ id: 1, name: '카메라', totalQuantity: 5, components: [{ componentId: 2, quantity: 1 }] });
      if (where.id === 2) return Promise.resolve({ id: 2, name: '삼각대', totalQuantity: 5, components: [] });
      return Promise.resolve(null);
    });

    mockPrisma.rentalItem.findMany.mockResolvedValue([]); // 재고 넉넉함
    mockPrisma.rental.create.mockResolvedValue({ id: 100, user: { phoneNumber: '01012341234', name: '테스터' }, rentalItems: [] });

    await service.create(userId, dto);

    // 검증: rental.create가 호출될 때 rentalItems에 1번(카메라)과 2번(삼각대)이 모두 포함되어야 함
    expect(mockPrisma.rental.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
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
      items: [{ itemId: 1, quantity: 1, startDate: '2026-03-01', endDate: '2026-03-03' }],
    };

    // Mock: 카메라는 재고가 있으나 삼각대는 재고가 0인 상황
    mockPrisma.item.findUnique.mockImplementation(({ where }) => {
      if (where.id === 1) return Promise.resolve({ id: 1, name: '카메라', totalQuantity: 5, components: [{ componentId: 2, quantity: 1 }] });
      if (where.id === 2) return Promise.resolve({ id: 2, name: '삼각대', totalQuantity: 1, components: [] });
      return Promise.resolve(null);
    });

    // 삼각대(ID: 2)에 대해 이미 1개가 예약되어 있다고 설정
    mockPrisma.rentalItem.findMany.mockImplementation(({ where }) => {
      if (where.itemId === 2) return Promise.resolve([{ quantity: 1 }]); 
      return Promise.resolve([]);
    });

    await expect(service.create(userId, dto)).rejects.toThrow(
      new ConflictException("'삼각대'의 재고가 부족합니다. (남은 수량: 0)"),
    );
  });

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
    mockPrisma.rental.update.mockResolvedValue({ ...overdueRental, status: RentalStatus.OVERDUE });

    await service.handleOverdueRentals();

    // 검증: 상태가 OVERDUE로 업데이트되었는지
    expect(mockPrisma.rental.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 500 },
        data: expect.objectContaining({ status: RentalStatus.OVERDUE }),
      }),
    );

    // 검증: 연체 안내 SMS가 발송되었는지
    expect(smsService.sendSMS).toHaveBeenCalledWith(
      '01011112222',
      expect.stringContaining('연체 상태이오니 즉시 반납 부탁드립니다.'),
    );
  });
});
