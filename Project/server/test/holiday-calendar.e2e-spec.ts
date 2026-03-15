import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('GET /api/admin/holidays/calendar', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  jest.setTimeout(30000);

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.setGlobalPrefix('api');
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // 테스트용 휴무일 등록 (2026-03-17 화요일 — 평일이므로 HOLIDAY로 확인)
    await prisma.holiday.upsert({
      where: { holidayDate: new Date('2026-03-17T00:00:00.000Z') },
      update: { description: '테스트 휴무일' },
      create: { holidayDate: new Date('2026-03-17T00:00:00.000Z'), description: '테스트 휴무일' },
    });
  });

  afterAll(async () => {
    await prisma.holiday.deleteMany({
      where: { holidayDate: new Date('2026-03-17T00:00:00.000Z') },
    });
    await app.close();
  });

  it('2026년 3월 조회 → 주말 + 등록 휴무일 포함', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/admin/holidays/calendar?year=2026&month=3');

    expect(res.status).toBe(200);
    expect(res.body.year).toBe(2026);
    expect(res.body.month).toBe(3);

    const dates: string[] = res.body.holidays.map((h: any) => h.date);

    // 주말 포함 확인
    expect(dates).toContain('2026-03-07'); // 토
    expect(dates).toContain('2026-03-08'); // 일
    expect(dates).toContain('2026-03-14'); // 토
    expect(dates).toContain('2026-03-15'); // 일

    // 등록 휴무일 포함 확인
    expect(dates).toContain('2026-03-17');
    const holiday = res.body.holidays.find((h: any) => h.date === '2026-03-17');
    expect(holiday.type).toBe('HOLIDAY');
    expect(holiday.description).toBe('테스트 휴무일');

    // 평일은 포함 안됨
    expect(dates).not.toContain('2026-03-16'); // 월요일 (등록 안 됨)
    expect(dates).not.toContain('2026-03-18'); // 수요일
  });

  it('주말만 있는 달도 정상 반환', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/admin/holidays/calendar?year=2026&month=1');

    expect(res.status).toBe(200);
    const types: string[] = res.body.holidays.map((h: any) => h.type);
    // 모두 WEEKEND 또는 HOLIDAY
    types.forEach((t) => expect(['WEEKEND', 'HOLIDAY']).toContain(t));
  });

  it('month 파라미터 누락 → 400', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/admin/holidays/calendar?year=2026');
    expect(res.status).toBe(400);
  });

  it('year 범위 초과 → 400', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/admin/holidays/calendar?year=2100&month=1');
    expect(res.status).toBe(400);
  });
});
