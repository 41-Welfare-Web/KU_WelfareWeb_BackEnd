const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanup() {
  console.log('🚀 RentalWeb Database Cleanup Tool');
  console.log('----------------------------------');

  try {
    // 1. 트랜잭션 데이터 삭제 (연관 관계 순서 고려: 자식 -> 부모)
    console.log('🧹 삭제 중: 트랜잭션 및 로그 데이터...');
    
    // 로그 및 임시 코드
    await prisma.auditLog.deleteMany({});
    await prisma.verificationCode.deleteMany({});
    await prisma.cartItem.deleteMany({});

    // 플로터 주문 이력 및 주문
    await prisma.plotterOrderHistory.deleteMany({});
    await prisma.plotterOrder.deleteMany({});

    // 대여 이력, 대여 품목, 대여 마스터
    await prisma.rentalHistory.deleteMany({});
    await prisma.rentalItem.deleteMany({});
    await prisma.rental.deleteMany({});
    
    console.log('✅ 대여, 플로터, 로그 데이터 삭제 완료.');

    // 2. 유저 데이터 정리 (ADMIN은 남기고 USER만 삭제)
    console.log('👥 사용자 정리 중 (관리자 계정 제외)...');
    const deleteUsers = await prisma.user.deleteMany({
      where: {
        role: 'USER'
      }
    });
    console.log(`✅ 일반 사용자 ${deleteUsers.count}명 삭제 완료.`);

    // 3. 물품 통계 초기화 (선택 사항)
    console.log('📊 물품 대여 횟수 초기화 중...');
    await prisma.item.updateMany({
      data: {
        rentalCount: 0
      }
    });
    console.log('✅ 모든 물품의 대여 횟수를 0으로 초기화했습니다.');

    // 4. 개별 실물 상태 초기화
    console.log('🔧 개별 실물(Instance) 상태 초기화 중...');
    await prisma.itemInstance.updateMany({
      data: {
        status: 'AVAILABLE'
      }
    });
    console.log('✅ 모든 실물의 상태를 AVAILABLE로 변경했습니다.');

    console.log('----------------------------------');
    console.log('🎉 데이터베이스 정리가 성공적으로 완료되었습니다.');
    console.log('💡 카테고리, 물품 목록, 시스템 설정은 보존되었습니다.');

  } catch (error) {
    console.error('❌ 정리 중 오류 발생:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanup();
