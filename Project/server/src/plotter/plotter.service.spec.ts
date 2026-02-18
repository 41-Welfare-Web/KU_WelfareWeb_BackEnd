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
            user: { findUnique: jest.fn().mockResolvedValue({ id: 'user-id', department: '중앙동아리', name: '테스터', phoneNumber: '01012341234' }) },
          },
        },
        {
          provide: FilesService,
          useValue: { uploadFile: jest.fn().mockResolvedValue('http://example.com/file.pdf') },
        },
        {
          provide: ConfigurationsService,
          useValue: { getValue: jest.fn().mockResolvedValue('0') },
        },
        {
          provide: HolidaysService,
          useValue: { calculateBusinessDate: jest.fn().mockResolvedValue(new Date()) },
        },
        {
          provide: SmsService,
          useValue: { sendPlotterStatusNotice: jest.fn().mockResolvedValue(true) },
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
      purpose: 'Test',
      paperSize: 'A0',
      pageCount: 1,
      isPaidService: false,
    };

    await expect(service.create('user-id', dto, fakePdf, undefined)).rejects.toThrow(
      new BadRequestException('유효하지 않은 PDF 형식입니다. 실제 PDF 파일을 업로드해주세요.'),
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
      purpose: '예산안 출력',
      department: '중앙동아리',
      paperSize: 'A0',
      pageCount: 1,
    } as any;

    const result = await service.create('user-id', dto, realPdf, undefined);
    expect(result).toBeDefined();
  });
});
