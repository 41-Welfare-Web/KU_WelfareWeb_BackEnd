import { Test, TestingModule } from '@nestjs/testing';
import { HolidaysService } from './holidays.service';
import { PrismaService } from '../prisma/prisma.service';

describe('HolidaysService', () => {
  let service: HolidaysService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HolidaysService,
        {
          provide: PrismaService,
          useValue: {
            holiday: {
              findUnique: jest.fn(),
              create: jest.fn(),
              findMany: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<HolidaysService>(HolidaysService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('isHoliday', () => {
    it('should return true for weekends', async () => {
      // 2023-10-07 is Saturday
      const saturday = new Date('2023-10-07T00:00:00Z');
      expect(await service.isHoliday(saturday)).toBe(true);

      // 2023-10-08 is Sunday
      const sunday = new Date('2023-10-08T00:00:00Z');
      expect(await service.isHoliday(sunday)).toBe(true);
    });

    it('should return true for registered holidays', async () => {
      // 2023-10-09 is Monday (Hangul Day in Korea, assume it's registered)
      const monday = new Date('2023-10-09T00:00:00Z');
      (prisma.holiday.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        holidayDate: monday,
        description: 'Test Holiday',
      });

      expect(await service.isHoliday(monday)).toBe(true);
    });

    it('should return false for business days', async () => {
      // 2023-10-10 is Tuesday
      const tuesday = new Date('2023-10-10T00:00:00Z');
      (prisma.holiday.findUnique as jest.Mock).mockResolvedValue(null);

      expect(await service.isHoliday(tuesday)).toBe(false);
    });
  });

  describe('calculateBusinessDate', () => {
    it('should calculate correct date skipping weekends', async () => {
      // Start: 2023-10-06 (Friday)
      // + 2 business days -> should be 2023-10-10 (Tuesday)
      // Fri -> Sat(X) -> Sun(X) -> Mon(O) -> Tue(O)

      const start = new Date('2023-10-06T00:00:00Z');

      (prisma.holiday.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.calculateBusinessDate(start, 2);
      expect(result.toISOString()).toContain('2023-10-10');
    });

    it('should calculate correct date skipping weekends and holidays', async () => {
      // Start: 2023-10-06 (Friday)
      // + 2 business days
      // Fri -> Sat(X) -> Sun(X) -> Mon(Holiday) -> Tue(O) -> Wed(O)

      const start = new Date('2023-10-06T00:00:00Z');

      // Mocking behavior
      // isHoliday called for Sat, Sun -> returns true by logic
      // isHoliday called for Mon (2023-10-09) -> returns true (DB)
      // isHoliday called for Tue, Wed -> returns false

      // We need to implement a smarter mock for findUnique because it's called multiple times with different dates
      (prisma.holiday.findUnique as jest.Mock).mockImplementation(
        (args: { where: { holidayDate: Date } }) => {
          const { where } = args;
          const dateStr = where.holidayDate.toISOString();
          if (dateStr.includes('2023-10-09')) {
            return Promise.resolve({
              id: 1,
              holidayDate: where.holidayDate,
              description: 'Holiday',
            });
          }
          return Promise.resolve(null);
        },
      );

      const result = await service.calculateBusinessDate(start, 2);
      expect(result.toISOString()).toContain('2023-10-11');
    });
  });
});
