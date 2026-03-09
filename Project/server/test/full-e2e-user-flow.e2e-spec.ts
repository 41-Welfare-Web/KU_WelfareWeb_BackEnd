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
    departmentType: '중앙동아리', // 무료 조건을 위해 변경
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

    // 기존 테스트 데이터 클린업 (사용자 정보는 유지하되 연관 데이터만 삭제)
    const user = await prisma.user.findUnique({ where: { username: testUser.username } });
    if (user) {
      // 1. 대여 관련 이력 및 아이템 삭제
      await prisma.rentalHistory.deleteMany({ where: { rental: { userId: user.id } } });
      await prisma.rentalItem.deleteMany({ where: { rental: { userId: user.id } } });
      await prisma.rental.deleteMany({ where: { userId: user.id } });

      // 2. 플로터 관련 이력 및 주문 삭제 (주문 ID를 먼저 찾아서 이력 삭제)
      const userOrders = await prisma.plotterOrder.findMany({ where: { userId: user.id } });
      const orderIds = userOrders.map(o => o.id);
      
      if (orderIds.length > 0) {
        await prisma.plotterOrderHistory.deleteMany({ where: { orderId: { in: orderIds } } });
      }
      await prisma.plotterOrder.deleteMany({ where: { userId: user.id } });

      // 3. 소속 업데이트
      await prisma.user.update({
        where: { id: user.id },
        data: { departmentType: '중앙동아리', departmentName: '테스트동아리' }
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
      
      // HolidaysService를 사용하여 실제 가공 가능한 영업일 계산 (최소 2일 이후)
      const holidaysService = app.get(require('../src/holidays/holidays.service').HolidaysService);
      const minPickupDate = await holidaysService.calculateBusinessDate(new Date(), 3);

      const response = await request(app.getHttpServer())
        .post('/api/plotter/orders')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .field('purpose', '회칙 명시 사항 인쇄(예산안 등)')
        .field('paperSize', 'A0')
        .field('pageCount', '1')
        .field('departmentType', '중앙동아리')
        .field('departmentName', '테스트동아리')
        .field('pickupDate', minPickupDate.toISOString().split('T')[0])
        .attach('pdfFile', pdfBuffer, { filename: 'e2e-test.pdf', contentType: 'application/pdf' });

      if (response.status !== 201) {
        console.log('Plotter Order Creation Failed Body:', JSON.stringify(response.body, null, 2));
      }
      expect(response.status).toBe(201);
      expect(response.body.price).toBe(0);
      expect(response.body.fileUrl).toBeDefined(); // 파일 저장 확인
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

    it('should complete rental lifecycle (Admin: RENTED -> RETURNED)', async () => {
      // 1. 수령 처리
      await request(app.getHttpServer())
        .put(`/api/rentals/${createdRentalId}/status`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ status: 'RENTED', memo: 'E2E 수령 완료' })
        .expect(200);

      // 2. 반납 처리
      const finalRes = await request(app.getHttpServer())
        .put(`/api/rentals/${createdRentalId}/status`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ status: 'RETURNED', memo: 'E2E 반납 완료' });

      expect(finalRes.status).toBe(200);
      expect(finalRes.body.status).toBe('RETURNED');
    });
  });

  describe('4. Dashboard Verification', () => {
    it('should reflect all activities in user dashboard', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users/me/dashboard')
        .set('Authorization', `Bearer ${userAccessToken}`);

      expect(response.status).toBe(200);
      // 최근 렌탈 이력에 포함되어야 함
      expect(response.body.recentRentals.length).toBeGreaterThan(0);
    });
  });
});
