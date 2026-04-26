import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const targetIds = [119, 120, 122, 123];
  // UTC 시간 기준으로 00:00:00 설정 (한국 시간 오전 9시 기준)
  const newStartDate = new Date('2026-05-18T00:00:00.000Z');
  const newEndDate = new Date('2026-05-22T00:00:00.000Z');

  console.log(`Starting update for Rental IDs: ${targetIds.join(', ')}`);
  console.log(`Target Start Date: ${newStartDate.toISOString()}`);
  console.log(`Target End Date: ${newEndDate.toISOString()}`);

  // 트랜잭션을 사용하여 안전하게 일괄 업데이트
  await prisma.$transaction(async (tx) => {
    // 1. 변경 전 데이터 확인
    const beforeRentals = await tx.rental.findMany({
      where: { id: { in: targetIds } },
      select: { id: true, startDate: true, endDate: true },
      orderBy: { id: 'asc' }
    });
    
    console.log('\n[1/3] 변경 전 데이터 상태:');
    console.table(beforeRentals.map(r => ({
      ID: r.id,
      '기존 시작일': r.startDate.toISOString().split('T')[0],
      '기존 종료일': r.endDate.toISOString().split('T')[0]
    })));

    // 2. 데이터 업데이트
    const updateResult = await tx.rental.updateMany({
      where: { id: { in: targetIds } },
      data: {
        startDate: newStartDate,
        endDate: newEndDate
      }
    });
    
    console.log(`\n[2/3] 업데이트 실행: 총 ${updateResult.count}건 변경됨.`);

    // 3. 변경 후 데이터 확인
    const afterRentals = await tx.rental.findMany({
      where: { id: { in: targetIds } },
      select: { id: true, startDate: true, endDate: true },
      orderBy: { id: 'asc' }
    });
    
    console.log('\n[3/3] 변경 후 데이터 상태 (최종 확인):');
    console.table(afterRentals.map(r => ({
      ID: r.id,
      '변경 시작일': r.startDate.toISOString().split('T')[0],
      '변경 종료일': r.endDate.toISOString().split('T')[0]
    })));
  });

  console.log('\n✅ 실서버 DB 수정이 성공적으로 완료되었습니다.');
}

main()
  .catch((e) => {
    console.error('❌ 업데이트 중 오류가 발생했습니다:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
