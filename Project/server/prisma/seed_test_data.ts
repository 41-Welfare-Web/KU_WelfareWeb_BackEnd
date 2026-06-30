/**
 * 마이페이지 수정/취소 버튼 조건 테스트용 데이터 시딩 스크립트
 *
 * 실행: npx ts-node prisma/seed_test_data.ts
 *
 * 생성 데이터:
 *   testuser / test1234!
 *   대여 3건:
 *     [1] 전부 RESERVED  → 수정O, 취소O
 *     [2] 혼합 RESERVED+RENTED → RESERVED만 수정O, 취소X
 *     [3] 전부 RENTED    → 수정X, 취소X
 */

import { PrismaClient, RentalStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 테스트 데이터 시딩 시작...');

  // 1. 테스트 유저 생성
  const password = await bcrypt.hash('test1234!', 10);
  const user = await prisma.user.upsert({
    where: { username: 'testuser' },
    update: {},
    create: {
      username: 'testuser',
      password,
      name: '테스트유저',
      studentId: '2024999999',
      phoneNumber: '010-9999-9999',
      departmentType: '공과대학',
      departmentName: '컴퓨터공학부',
    },
  });
  console.log(`✅ 테스트 유저 생성 완료 (ID: testuser / PW: test1234!)`);

  // 2. 물품 2개 조회 (DB에 있는 것 사용)
  const items = await prisma.item.findMany({
    where: { deletedAt: null },
    take: 2,
  });

  if (items.length < 2) {
    throw new Error('DB에 물품이 2개 이상 없습니다. 먼저 seed.ts 또는 supabase/seed.sql을 실행하세요.');
  }

  const [itemA, itemB] = items;
  console.log(`📦 물품 사용: [${itemA.id}] ${itemA.name}, [${itemB.id}] ${itemB.name}`);

  const today = new Date();
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);
  const nextNextWeek = new Date(today);
  nextNextWeek.setDate(today.getDate() + 14);

  // 3. 대여 1: 전부 RESERVED → 수정O, 취소O
  const rental1 = await prisma.rental.create({
    data: {
      userId: user.id,
      startDate: nextWeek,
      endDate: nextNextWeek,
      departmentType: '공과대학',
      departmentName: '컴퓨터공학부',
      rentalItems: {
        create: [
          { itemId: itemA.id, quantity: 1, status: RentalStatus.RESERVED },
          { itemId: itemB.id, quantity: 2, status: RentalStatus.RESERVED },
        ],
      },
    },
  });
  console.log(`✅ 대여 1 생성 (ID: ${rental1.id}) — 전부 RESERVED → 수정O, 취소O`);

  // 4. 대여 2: RESERVED + RENTED 혼합 → RESERVED만 수정O, 취소X
  const rental2 = await prisma.rental.create({
    data: {
      userId: user.id,
      startDate: today,
      endDate: nextWeek,
      departmentType: '공과대학',
      departmentName: '컴퓨터공학부',
      rentalItems: {
        create: [
          { itemId: itemA.id, quantity: 1, status: RentalStatus.RESERVED },
          { itemId: itemB.id, quantity: 1, status: RentalStatus.RENTED },
        ],
      },
    },
  });
  console.log(`✅ 대여 2 생성 (ID: ${rental2.id}) — RESERVED+RENTED 혼합 → RESERVED만 수정O, 취소X`);

  // 5. 대여 3: 전부 RENTED → 수정X, 취소X
  const rental3 = await prisma.rental.create({
    data: {
      userId: user.id,
      startDate: today,
      endDate: nextWeek,
      departmentType: '공과대학',
      departmentName: '컴퓨터공학부',
      rentalItems: {
        create: [
          { itemId: itemA.id, quantity: 1, status: RentalStatus.RENTED },
        ],
      },
    },
  });
  console.log(`✅ 대여 3 생성 (ID: ${rental3.id}) — 전부 RENTED → 수정X, 취소X`);

  console.log('\n🏁 테스트 데이터 시딩 완료!');
  console.log('======================================');
  console.log('로그인: testuser / test1234!');
  console.log('======================================');
  console.log(`대여 ${rental1.id}: 전부 RESERVED  → 아이템 2개 모두 [수정] 버튼, [취소] 버튼 O`);
  console.log(`대여 ${rental2.id}: RESERVED+RENTED → 첫 번째 아이템만 [수정] 버튼, [취소] 버튼 X`);
  console.log(`대여 ${rental3.id}: 전부 RENTED     → [수정] [취소] 버튼 없음`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
