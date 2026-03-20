import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

describe('Edge Cases & Security Stress Test', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let userToken: string;
  let testItemId: number;

  // 타임아웃 30초로 연장
  jest.setTimeout(30000);

  const testUser = {
    username: 'tester01090665493z',
    password: '@Jgn1517',
    name: '경계조건테스터',
    studentId: '202499999',
    phoneNumber: '01011112222',
    departmentType: '학과 학생회',
    departmentName: '보안학과',
  };

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

    // 테스트용 사용자 강제 생성 또는 업데이트
    const hashedPassword = await bcrypt.hash(testUser.password, 10);
    await prisma.user.upsert({
      where: { username: testUser.username },
      update: {
        password: hashedPassword,
        role: 'USER',
        deletedAt: null,
      },
      create: {
        username: testUser.username,
        password: hashedPassword,
        name: testUser.name,
        studentId: testUser.studentId,
        phoneNumber: testUser.phoneNumber,
        departmentType: testUser.departmentType,
        departmentName: testUser.departmentName,
        role: 'USER',
      },
    });

    // 테스트용 계정 로그인
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: testUser.username, password: testUser.password });
    userToken = loginRes.body.accessToken;

    const itemsRes = await request(app.getHttpServer()).get('/api/items');
    testItemId = itemsRes.body[0].id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Rental Duration Boundary (Max 15 Days)', () => {
    it('should ALLOW rental of EXACTLY 15 days', async () => {
      const start = new Date();
      start.setDate(start.getDate() + 1); // 내일
      const end = new Date(start);
      end.setDate(start.getDate() + 14); // 시작일 포함 총 15일

      const response = await request(app.getHttpServer())
        .post('/api/rentals')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          departmentType: '학과 학생회',
          items: [{
            itemId: testItemId,
            quantity: 1,
            startDate: start.toISOString().split('T')[0],
            endDate: end.toISOString().split('T')[0]
          }]
        });

      expect(response.status).toBe(201);
    });

    it('should BLOCK rental of 16 days', async () => {
      const start = new Date();
      start.setDate(start.getDate() + 20); 
      const end = new Date(start);
      end.setDate(start.getDate() + 15); // 시작일 포함 총 16일

      const response = await request(app.getHttpServer())
        .post('/api/rentals')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          departmentType: '학과 학생회',
          items: [{
            itemId: testItemId,
            quantity: 1,
            startDate: start.toISOString().split('T')[0],
            endDate: end.toISOString().split('T')[0]
          }]
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('최대 대여 가능 기간은 15일');
    });
  });

  describe('2. Plotter Paid Logic & File Security', () => {
    it('should calculate price and REQUIRE receipt for non-free purpose', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/plotter/calculate-price')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          purpose: '개인 소장용 포스터', // 유료 목적
          paperSize: 'A0',
          pageCount: 1,
          orderQuantity: 1,
          departmentType: '기타'
        });

      expect(response.body.price).toBeGreaterThan(0);
      expect(response.body.isFree).toBe(false);

      // 주문 시도 (영수증 누락)
      const orderRes = await request(app.getHttpServer())
        .post('/api/plotter/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .field('purpose', '개인 소장용 포스터')
        .field('paperSize', 'A0')
        .field('pageCount', '1')
        .field('orderQuantity', '1')
        .field('departmentType', '기타')
        .field('pickupDate', '2026-12-24') // 목요일 (평일)
        .attach('pdfFile', Buffer.from('%PDF-1.4'), 'test.pdf');

      expect(orderRes.status).toBe(400);
      expect(orderRes.body.message).toContain('입금 내역 이미지를 업로드해주세요');
    });

    it('should block non-PDF files even with .pdf extension (Magic Number Check)', async () => {
      const fakePdf = Buffer.from('NOT-A-PDF-CONTENT');
      
      const response = await request(app.getHttpServer())
        .post('/api/plotter/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .field('purpose', '회칙 인쇄')
        .field('paperSize', 'A0')
        .field('pageCount', '1')
        .field('orderQuantity', '1')
        .field('departmentType', '중앙자치기구')
        .field('pickupDate', '2026-12-24')
        .attach('pdfFile', fakePdf, 'fake.pdf');

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('유효하지 않은 PDF 형식');
    });
  });

  describe('3. Account Lockout Security', () => {
    it('should lock account after 5 failed attempts', async () => {
      const suffix = Date.now().toString().slice(-10);
      const tempUser = `lock_${suffix}`; // 총 15자 (20자 이내)
      
      // 1. 임시 사용자 생성
      await prisma.user.create({
        data: {
          username: tempUser,
          password: 'hashed_password', // bcrypt 무시하고 더미
          name: '잠금테스트',
          studentId: `ST_${tempUser}`,
          phoneNumber: `PH_${tempUser}`,
          departmentType: '학과'
        }
      });

      // 2. 5번 실패 시도
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/api/auth/login')
          .send({ username: tempUser, password: 'wrong_password' });
      }

      // 3. 6번째 시도 시 잠금 확인
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ username: tempUser, password: 'wrong_password' });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('계정이 잠겼습니다');
    });
  });
});
