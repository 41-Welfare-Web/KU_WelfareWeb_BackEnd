import { PrismaClient, Role } from '@prisma/client';
import { backup } from './backup_db';

const prisma = new PrismaClient();

async function resetDynamicData() {
  console.log('🧹 [Mode: QA] 유동적 데이터(트랜잭션) 초기화 중...');

  // 삭제 순서 (외래키 제약 준수)
  await prisma.auditLog.deleteMany();
  await prisma.verificationCode.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.rentalHistory.deleteMany();
  await prisma.rentalItem.deleteMany();
  await prisma.rental.deleteMany();
  await prisma.plotterOrderHistory.deleteMany();
  await prisma.plotterOrder.deleteMany();

  // 관리자를 제외한 일반 사용자만 삭제 (재가입 테스트 가능하게)
  const deleteUsers = await prisma.user.deleteMany({
    where: { role: Role.USER }
  });

  console.log(`✅ 완료: 일반 사용자(${deleteUsers.count}명) 및 모든 대여/주문 기록이 삭제되었습니다.`);
  console.log('✨ 정적 데이터(물품 목록, 카테고리, 시스템 설정)는 유지되었습니다.');
}

async function resetCatalogData() {
  console.log('📦 [Mode: Catalog] 물품 카탈로그 및 마스터 데이터 초기화 중...');

  // 유동적 데이터 먼저 삭제
  await resetDynamicData();

  // 물품 관련 데이터 삭제
  await prisma.itemComponent.deleteMany();
  await prisma.itemImage.deleteMany();
  await prisma.itemInstance.deleteMany();
  await prisma.item.deleteMany();

  console.log('✅ 완료: 모든 물품 및 자산 정보가 삭제되었습니다.');
  console.log('💡 이후 "npx prisma db seed"를 실행하여 마스터 데이터를 다시 채우세요.');
}

async function fullFactoryReset() {
  console.log('🚨 [Mode: FULL] 전체 데이터베이스 공장 초기화 중...');

  const tablenames = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname='public'
  `;

  for (const { tablename } of tablenames) {
    if (tablename !== '_prisma_migrations') {
      try {
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE "public"."${tablename}" RESTART IDENTITY CASCADE;`);
      } catch (error) {
        console.log(`⚠️  ${tablename} 테이블 초기화 건너뜀 (이미 비어있거나 권한 부족)`);
      }
    }
  }

  console.log('✅ 완료: 모든 데이터가 삭제되고 시퀀스가 초기화되었습니다.');
}

async function main() {
  const mode = process.argv[2] || 'qa';

  console.log('==============================================');
  console.log(`🚀 RentalWeb DB Manager - Mode: ${mode.toUpperCase()}`);
  console.log('==============================================');

  try {
    // 삭제 전 자동 백업
    console.log('\n💾 삭제 전 자동 백업을 시작합니다...');
    await backup();
    console.log('');

    switch (mode.toLowerCase()) {
      case 'qa':
        await resetDynamicData();
        break;
      case 'catalog':
        await resetCatalogData();
        break;
      case 'full':
        await fullFactoryReset();
        break;
      default:
        console.log('❌ 유효하지 않은 모드입니다. (qa, catalog, full 중 선택)');
    }
  } catch (error) {
    console.error('❌ 처리 중 오류 발생:', error);
  } finally {
    await prisma.$disconnect();
    console.log('==============================================');
  }
}

main();
