const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fullCleanup() {
  console.log('🚀 RentalWeb Full Database Reset (Keeping Setup)');
  console.log('-----------------------------------------------');

  try {
    // 1. 트랜잭션 데이터 및 로그 삭제
    console.log('🧹 삭제 중: 대여, 주문, 장바구니, 로그...');
    await prisma.auditLog.deleteMany({});
    await prisma.verificationCode.deleteMany({});
    await prisma.cartItem.deleteMany({});
    await prisma.rentalHistory.deleteMany({});
    await prisma.rentalItem.deleteMany({});
    await prisma.rental.deleteMany({});
    await prisma.plotterOrderHistory.deleteMany({});
    await prisma.plotterOrder.deleteMany({});

    // 2. 물품 관련 전체 데이터 삭제 (연관 관계 순서: 구성품 -> 실물 -> 물품)
    console.log('🧹 삭제 중: 세트 구성품, 개별 실물, 물품 목록...');
    await prisma.itemComponent.deleteMany({});
    await prisma.itemInstance.deleteMany({});
    await prisma.item.deleteMany({});

    console.log('-----------------------------------------------');
    console.log('🎉 데이터 삭제 완료!');
    console.log('✅ 유지됨: 사용자 계정(Users), 시스템 설정(Configurations), 카테고리(Categories)');
    console.log('✅ 초기화됨: 물품, 대여, 주문, 로그, 장바구니 전체');

  } catch (error) {
    console.error('❌ 정리 중 오류 발생:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fullCleanup();
