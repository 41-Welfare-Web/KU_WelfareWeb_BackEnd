import { Test, TestingModule } from '@nestjs/testing';
import { PlotterService } from './plotter.service';
import { PrismaService } from '../prisma/prisma.service';
import { FilesService } from '../common/files.service';
import { ConfigurationsService } from '../configurations/configurations.service';
import { HolidaysService } from '../holidays/holidays.service';
import { SmsService } from '../sms/sms.service';
import { BadRequestException } from '@nestjs/common';

jest.mock('uuid', () => ({ v4: () => 'test-uuid' }));

describe('PlotterService', () => {
  let service: PlotterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlotterService,
        {
          provide: PrismaService,
          useValue: {
            plotterOrder: { create: jest.fn().mockResolvedValue({ id: 1 }) },
            user: {
              findFirst: jest.fn().mockResolvedValue({
                id: 'user-id',
                departmentType: '중앙동아리',
                name: '테스터',
                phoneNumber: '01012341234',
              }),
              findUnique: jest.fn().mockResolvedValue({
                id: 'user-id',
                departmentType: '중앙동아리',
                name: '테스터',
                phoneNumber: '01012341234',
              }),
            },
          },
        },
        {
          provide: FilesService,
          useValue: {
            uploadFile: jest
              .fn()
              .mockResolvedValue('http://example.com/file.pdf'),
          },
        },
        {
          provide: ConfigurationsService,
          useValue: { getValue: jest.fn().mockResolvedValue('0') },
        },
        {
          provide: HolidaysService,
          useValue: {
            calculateBusinessDate: jest
              .fn()
              .mockResolvedValue(new Date('2000-01-01')),
            isHoliday: jest.fn().mockResolvedValue(false),
          },
        },
        {
          provide: SmsService,
          useValue: {
            sendPlotterStatusNotice: jest.fn().mockResolvedValue(true),
            sendSMS: jest.fn().mockResolvedValue(true),
          },
        },
      ],
    }).compile();

    service = module.get<PlotterService>(PlotterService);
  });

  it('should throw error if file is not a real PDF (Magic Number mismatch)', async () => {
    const fakePdf = {
      buffer: Buffer.from('FAKE-FILE-CONTENT'),
      mimetype: 'application/pdf',
      originalname: 'test.pdf',
      size: 100,
    } as Express.Multer.File;

    const dto = {
      departmentType: '학과',
      departmentName: '컴퓨터공학과',
      purpose: 'Test',
      paperSize: 'A0',
      pageCount: 1,
      pickupDate: '2026-03-10',
    };

    await expect(
      service.create('user-id', dto as any, fakePdf, undefined),
    ).rejects.toThrow(
      new BadRequestException('유효하지 않은 PDF 형식입니다.'),
    );
  });

  it('should pass if file is a real PDF (Magic Number match)', async () => {
    const realPdf = {
      buffer: Buffer.from('%PDF-1.4\n...content...'),
      mimetype: 'application/pdf',
      originalname: 'test.pdf',
      size: 100,
    } as Express.Multer.File;

    const dto = {
      departmentType: '중앙동아리',
      departmentName: '소소',
      purpose: '예산안 출력',
      paperSize: 'A0',
      pageCount: 1,
      pickupDate: '2026-03-15',
    } as any;

    const result = await service.create('user-id', dto, realPdf, undefined);
    expect(result).toBeDefined();
  });

  describe('calculateEstimatedPrice', () => {
    it('should identify as free if purpose is a free target (regardless of department)', async () => {
      // 소속이 유료 대상이어도 목적이 무료이면 무료
      const mockUser = { id: 'user-id', departmentType: '학과 학생회' };
      const prisma = (service as any).prisma;
      prisma.user.findFirst.mockResolvedValue(mockUser);

      const config = (service as any).configService;
      config.getValue.mockImplementation(async (key: string) => {
        if (key === 'plotter_free_purposes') return '예산안 출력';
        if (key === 'plotter_price_a0') return '5000';
        return '0';
      });

      const dto = {
        purpose: '예산안 출력',
        paperSize: 'A0',
        pageCount: 1,
        departmentType: '학과 학생회',
      };

      const result = await service.calculateEstimatedPrice(dto, 'user-id');
      expect(result.isFree).toBe(true);
      expect(result.price).toBe(0);
      expect(result.message).toContain('무료 인쇄 지원 대상입니다.');
    });

    it('should identify as paid if purpose is not a free target (regardless of department)', async () => {
      // 소속이 무료 대상이어도 목적이 유료이면 유료
      const mockUser = { id: 'user-id', departmentType: '중앙동아리' };
      const prisma = (service as any).prisma;
      prisma.user.findFirst.mockResolvedValue(mockUser);

      const config = (service as any).configService;
      config.getValue.mockImplementation(async (key: string) => {
        if (key === 'plotter_free_purposes') return '예산안 출력';
        if (key === 'plotter_price_a0') return '5000';
        return '0';
      });

      // 무료 목적에 없는 purpose → 유료
      const dto = {
        purpose: '포스터 제작',
        paperSize: 'A0',
        pageCount: 1,
        departmentType: '중앙동아리',
      };

      const result = await service.calculateEstimatedPrice(dto, 'user-id');
      expect(result.isFree).toBe(false);
      expect(result.price).toBe(5000);
      expect(result.message).toContain('인쇄 비용은 총 5,000원입니다.');
    });
  });
});
