
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- [DB 점검 시작] ---');

  // 1. 시스템 설정 (Configurations)
  const configs = await prisma.configuration.findMany();
  console.log('\n[1] 시스템 설정 (Configurations)');
  configs.forEach(c => {
    console.log(`- ${c.configKey}: ${c.configValue} (${c.description || '설명 없음'})`);
  });

  // 2. 카테고리 및 물품 현황
  const categories = await prisma.category.findMany({
    include: {
      _count: {
        select: { items: true }
      }
    }
  });
  console.log('\n[2] 카테고리별 물품 등록 현황');
  categories.forEach(cat => {
    console.log(`- ${cat.name} (ID: ${cat.id}): ${cat._count.items}개 등록됨`);
  });

  // 3. 휴무일 (Holidays)
  const holidays = await prisma.holiday.findMany({
    orderBy: { holidayDate: 'asc' }
  });
  console.log('\n[3] 등록된 휴무일 (Holidays)');
  if (holidays.length === 0) {
    console.log('- 등록된 휴무일이 없습니다.');
  } else {
    holidays.forEach(h => {
      console.log(`- ${h.holidayDate.toISOString().split('T')[0]}: ${h.description || '설명 없음'}`);
    });
  }

  // 4. 물품 샘플 확인 (코드 및 관리 방식)
  const sampleItems = await prisma.item.findMany({
    take: 5,
    select: { name: true, itemCode: true, managementType: true, totalQuantity: true }
  });
  console.log('\n[4] 물품 데이터 샘플 (최근 5건)');
  sampleItems.forEach(item => {
    console.log(`- ${item.name} (${item.itemCode}): ${item.managementType} (수량: ${item.totalQuantity || 'N/A'})`);
  });

  console.log('\n--- [DB 점검 종료] ---');
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
