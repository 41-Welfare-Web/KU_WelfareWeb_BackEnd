import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Production-Ready Full E2E Flow', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // 가입된 계정 정보
  const testUser = {
    username: 'tester01090665493z',
    password: 'password123!',
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

    // 테스트용 사용자 존재 확인 및 초기화
    const user = await prisma.user.findUnique({ where: { username: testUser.username } });
    if (user) {
      await prisma.rentalHistory.deleteMany({ where: { rental: { userId: user.id } } });
      await prisma.rentalItem.deleteMany({ where: { rental: { userId: user.id } } });
      await prisma.rental.deleteMany({ where: { userId: user.id } });

      const userOrders = await prisma.plotterOrder.findMany({ where: { userId: user.id } });
      const orderIds = userOrders.map(o => o.id);
      if (orderIds.length > 0) {
        await prisma.plotterOrderHistory.deleteMany({ where: { orderId: { in: orderIds } } });
      }
      await prisma.plotterOrder.deleteMany({ where: { userId: user.id } });

      await prisma.user.update({
        where: { id: user.id },
        data: { departmentType: '중앙동아리', departmentName: '테스트동아리', role: 'USER' }
      });
    }
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
    it('should verify 0 price for Central Club + Free Purpose', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/plotter/calculate-price')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send({
          purpose: '회칙 명시 사항 인쇄(예산안 등)',
          paperSize: 'A0',
          pageCount: 1,
          departmentType: '중앙동아리'
        });

      expect(response.status).toBe(200);
      expect(response.body.price).toBe(0);
      expect(response.body.isFree).toBe(true);
    });

    it('should create plotter order with real PDF buffer', async () => {
      const pdfBuffer = Buffer.from('%PDF-1.4\n%E2E Test File Content');
      const pickupDateObj = new Date();
      pickupDateObj.setDate(pickupDateObj.getDate() + 7);
      const pickupDateStr = pickupDateObj.toISOString().split('T')[0];

      const response = await request(app.getHttpServer())
        .post('/api/plotter/orders')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .field('purpose', '회칙 명시 사항 인쇄(예산안 등)')
        .field('paperSize', 'A0')
        .field('pageCount', '1')
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
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 7);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 2);

      const response = await request(app.getHttpServer())
        .post('/api/rentals')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send({
          departmentType: testUser.departmentType,
          departmentName: testUser.departmentName,
          items: [{
            itemId: testItemId,
            quantity: 1,
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0]
          }]
        });

      expect(response.status).toBe(201);
      createdRentalId = response.body.rentals[0].id;
    });
  });

  describe('4. Safety & Security Rules', () => {
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
      const today = new Date();
      const longStartDate = new Date(today);
      longStartDate.setDate(today.getDate() + 1);
      
      const longEndDate = new Date(longStartDate);
      longEndDate.setDate(longStartDate.getDate() + 16); // 17일 대여 시도

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
              startDate: longStartDate.toISOString().split('T')[0],
              endDate: longEndDate.toISOString().split('T')[0],
            },
          ],
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('최대 대여 가능 기간은 15일');
    });
  });
});
