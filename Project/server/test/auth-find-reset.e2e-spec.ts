import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

describe('Auth - 아이디 찾기 / 비밀번호 재설정 요청', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  jest.setTimeout(30000);

  const testUser = {
    username: 'tester01090665493z',
    password: '@Jgn1517',
    name: '홍길동',
    studentId: '202410001',
    phoneNumber: '01090665493',
    departmentType: '중앙동아리',
    departmentName: '테스트동아리',
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

    // 테스트 유저 보장
    const hashedPassword = await bcrypt.hash(testUser.password, 10);
    // 전화번호 충돌 방지: 동일 번호를 가진 다른 유저 제거
    await prisma.user.deleteMany({
      where: { phoneNumber: testUser.phoneNumber, NOT: { username: testUser.username } },
    });
    await prisma.user.upsert({
      where: { username: testUser.username },
      update: { password: hashedPassword, deletedAt: null, name: testUser.name, phoneNumber: testUser.phoneNumber },
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

    // 이전 인증코드 정리
    await prisma.verificationCode.deleteMany({ where: { target: testUser.username } });
  });

  afterAll(async () => {
    await prisma.verificationCode.deleteMany({ where: { target: testUser.username } });
    await app.close();
  });

  // ─────────────────────────────────────────────
  // 아이디 찾기
  // ─────────────────────────────────────────────
  describe('POST /api/auth/find-username', () => {
    it('일치하는 정보 → 200 성공', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/find-username')
        .send({ name: testUser.name, phoneNumber: testUser.phoneNumber });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('SMS');
    });

    it('이름 불일치 → 404', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/find-username')
        .send({ name: '없는사람', phoneNumber: testUser.phoneNumber });

      expect(res.status).toBe(404);
    });

    it('전화번호 불일치 → 404', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/find-username')
        .send({ name: testUser.name, phoneNumber: '01000000000' });

      expect(res.status).toBe(404);
    });

  });

  // ─────────────────────────────────────────────
  // 비밀번호 재설정 요청
  // ─────────────────────────────────────────────
  describe('POST /api/auth/password-reset/request', () => {
    it('일치하는 정보 → 200 성공', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/password-reset/request')
        .send({ username: testUser.username, phoneNumber: testUser.phoneNumber });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('발송');
    });

    it('아이디 불일치 → 404', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/password-reset/request')
        .send({ username: 'nonexistent_user', phoneNumber: testUser.phoneNumber });

      expect(res.status).toBe(404);
    });

    it('전화번호 불일치 → 404', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/password-reset/request')
        .send({ username: testUser.username, phoneNumber: '01000000000' });

      expect(res.status).toBe(404);
    });

  });
});
