import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

describe('Production-Ready Full E2E Flow', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // 타임아웃 30초로 연장
  jest.setTimeout(30000);

  // 가입된 계정 정보 (사용자 지정값)
  const testUser = {
    username: 'tester01090665493z',
    password: '@Jgn1517',
    name: '홍길동',
    studentId: '202410001',
    phoneNumber: '01090665493',
    departmentType: '중앙동아리',
    departmentName: '테스트동아리',
  };

  const adminCredentials = {
    username: 'admin',
    password: 'admin123!',
  };

  let userAccessToken: string;
  let adminAccessToken: string;
  let testItemId: number;
  let createdRentalId: number;
  let createdOrderId: number;

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

    // 테스트용 사용자 강제 생성 또는 업데이트 (401 방지)
    const hashedPassword = await bcrypt.hash(testUser.password, 10);
    const user = await prisma.user.upsert({
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

    // 기존 데이터 청소 (테스트 독립성 보장)
    await prisma.rentalHistory.deleteMany({ where: { rental: { userId: user.id } } });
    await prisma.rentalItem.deleteMany({ where: { rental: { userId: user.id } } });
    await prisma.rental.deleteMany({ where: { userId: user.id } });

    const userOrders = await prisma.plotterOrder.findMany({ where: { userId: user.id } });
    const orderIds = userOrders.map((o) => o.id);
    if (orderIds.length > 0) {
      await prisma.plotterOrderHistory.deleteMany({
        where: { orderId: { in: orderIds } },
      });
    }
    await prisma.plotterOrder.deleteMany({ where: { userId: user.id } });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Login & Identity', () => {
    it('should login and get access token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ username: testUser.username, password: testUser.password });

      expect(response.status).toBe(200);
      userAccessToken = response.body.accessToken;
    });

    it('should login as admin', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send(adminCredentials);
      adminAccessToken = response.body.accessToken;
    });
  });

  describe('2. Plotter Free Verification & File Logic', () => {
    it('should verify 0 price for Free Purpose (department agnostic)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/plotter/calculate-price')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send({
          purpose: '회칙 명시 사항 인쇄(예산안 등)',
          paperSize: 'A0',
          pageCount: 1,
          orderQuantity: 1,
          departmentType: '중앙동아리'
        });

      expect(response.status).toBe(200);
      expect(response.body.price).toBe(0);
      expect(response.body.isFree).toBe(true);
    });

    it('should create plotter order with real PDF buffer', async () => {
      const pdfBuffer = Buffer.from('%PDF-1.4\n%E2E Test File Content');
      const pickupDateStr = toDateStr(getFutureWeekday(7));

      const response = await request(app.getHttpServer())
        .post('/api/plotter/orders')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .field('purpose', '회칙 명시 사항 인쇄(예산안 등)')
        .field('paperSize', 'A0')
        .field('pageCount', '1')
        .field('orderQuantity', '1')
        .field('departmentType', '중앙동아리')
        .field('departmentName', '테스트동아리')
        .field('pickupDate', pickupDateStr)
        .attach('pdfFile', pdfBuffer, { filename: 'e2e-test.pdf', contentType: 'application/pdf' });

      expect(response.status).toBe(201);
      expect(response.body.price).toBe(0);
      createdOrderId = response.body.id;
    });

    it('should allow admin to view and approve the order', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/plotter/orders/${createdOrderId}/status`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ status: 'CONFIRMED' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('CONFIRMED');
    });

    it('should save memo when admin updates plotter status', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/plotter/orders/${createdOrderId}/status`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ status: 'PRINTED', memo: '특수 용지 사용 완료' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('PRINTED');
      expect(response.body.memo).toBe('특수 용지 사용 완료');
    });

    it('should include phoneNumber in admin plotter orders list', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/plotter/orders')
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(response.status).toBe(200);
      const order = response.body.orders.find((o: any) => o.id === createdOrderId);
      expect(order).toBeDefined();
      expect(order.user.phoneNumber).toBeDefined();
      expect(order.user.phoneNumber).toBe(testUser.phoneNumber);
    });
  });

  describe('3. Rental & Cart Flow', () => {
    it('should fetch items and add to cart', async () => {
      const itemsRes = await request(app.getHttpServer()).get('/api/items');
      testItemId = itemsRes.body[0].id;

      const cartRes = await request(app.getHttpServer())
        .post('/api/cart')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send({ itemId: testItemId, quantity: 1 });
      
      expect(cartRes.status).toBe(201);
    });

    it('should create rental from cart', async () => {
      const rentalStart = getFutureWeekday(3);
      const rentalEnd = new Date(rentalStart);
      rentalEnd.setDate(rentalEnd.getDate() + 1);
      while (rentalEnd.getDay() === 0 || rentalEnd.getDay() === 6) {
        rentalEnd.setDate(rentalEnd.getDate() + 1);
      }
      const startDateStr = toDateStr(rentalStart);
      const endDateStr = toDateStr(rentalEnd);

      const response = await request(app.getHttpServer())
        .post('/api/rentals')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send({
          departmentType: testUser.departmentType,
          departmentName: testUser.departmentName,
          items: [{
            itemId: testItemId,
            quantity: 1,
            startDate: startDateStr,
            endDate: endDateStr
          }]
        });

      expect(response.status).toBe(201);
      createdRentalId = response.body.rentals[0].id;
    });
  });

  describe('4. Rental Status Unlock (RETURNED/CANCELED Re-transition)', () => {
    it('should allow admin to change status of a RETURNED rental', async () => {
      // RESERVED → RENTED → RETURNED 순서로 상태 변경
      await request(app.getHttpServer())
        .put(`/api/rentals/${createdRentalId}/status`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ status: 'RENTED' });

      await request(app.getHttpServer())
        .put(`/api/rentals/${createdRentalId}/status`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ status: 'RETURNED' });

      // RETURNED 상태에서 다시 상태 변경 (잠금 해제 확인)
      const response = await request(app.getHttpServer())
        .put(`/api/rentals/${createdRentalId}/status`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ status: 'OVERDUE', memo: '테스트 목적 재변경' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('OVERDUE');
    });

    it('should allow admin to update memo only without changing status', async () => {
      const before = await request(app.getHttpServer())
        .get(`/api/rentals/${createdRentalId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`);
      const statusBefore = before.body.status;

      const response = await request(app.getHttpServer())
        .put(`/api/rentals/${createdRentalId}/status`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ memo: '메모만 변경 테스트' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(statusBefore); // 상태 유지
      expect(response.body.memo).toBe('메모만 변경 테스트');
    });

    it('should allow admin to change status of a CANCELED rental', async () => {
      // 새 대여 생성 후 CANCELED → 다시 상태 변경 테스트
      const cancelStart = getFutureWeekday(14);
      const cancelEnd = new Date(cancelStart);
      cancelEnd.setDate(cancelEnd.getDate() + 1);
      while (cancelEnd.getDay() === 0 || cancelEnd.getDay() === 6) {
        cancelEnd.setDate(cancelEnd.getDate() + 1);
      }
      const startDateStr = toDateStr(cancelStart);
      const endDateStr = toDateStr(cancelEnd);

      const rentalRes = await request(app.getHttpServer())
        .post('/api/rentals')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send({
          departmentType: testUser.departmentType,
          departmentName: testUser.departmentName,
          items: [{ itemId: testItemId, quantity: 1, startDate: startDateStr, endDate: endDateStr }],
        });
      expect(rentalRes.status).toBe(201);
      const cancelRentalId = rentalRes.body.rentals[0].id;

      // CANCELED로 변경
      await request(app.getHttpServer())
        .put(`/api/rentals/${cancelRentalId}/status`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ status: 'CANCELED' });

      // CANCELED 상태에서 다시 상태 변경 (잠금 해제 확인)
      const response = await request(app.getHttpServer())
        .put(`/api/rentals/${cancelRentalId}/status`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ status: 'RESERVED', memo: '취소 후 재활성화' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('RESERVED');
    });
  });

  describe('5. Safety & Security Rules', () => {
    it('should block admin from self-withdrawal', async () => {
      const response = await request(app.getHttpServer())
        .delete('/api/users/me')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ password: 'admin123!' });

      expect(response.status).toBe(403);
      // '관리자'와 '탈퇴' 키워드가 포함되어 있는지 확인
      expect(response.body.message).toMatch(/관리자.*탈퇴/);
    });

    it('should block rental longer than 15 days', async () => {
      // 오늘로부터 30일 이상 뒤 평일 시작, 17일 뒤 평일 종료 (총 18일 이상)
      const longStart = getFutureWeekday(30);
      const longEnd = new Date(longStart);
      longEnd.setDate(longEnd.getDate() + 17);
      while (longEnd.getDay() === 0 || longEnd.getDay() === 6) {
        longEnd.setDate(longEnd.getDate() + 1);
      }
      const longStartDate = toDateStr(longStart);
      const longEndDate = toDateStr(longEnd);

      const response = await request(app.getHttpServer())
        .post('/api/rentals')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send({
          departmentType: '학과 학생회',
          departmentName: '컴퓨터공학과',
          items: [
            {
              itemId: testItemId,
              quantity: 1,
              startDate: longStartDate,
              endDate: longEndDate,
            },
          ],
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('최대 대여 가능 기간은 15일');
    });
  });
});
