import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  try {
    console.log('🔄 Re-ordering categories...');

    // 1. 임시 카테고리 생성 (물품 연결 유지용)
    const tempCat = await prisma.category.create({ data: { name: 'TEMP' } });
    await prisma.item.updateMany({ data: { categoryId: tempCat.id } });

    // 2. 기존 카테고리 모두 삭제
    await prisma.category.deleteMany({ where: { id: { not: tempCat.id } } });

    // 3. 요청하신 순서대로 생성
    const order = ['행사', '체육', '음향기기', '기타'];
    const newCats: Record<string, number> = {};
    
    for (const name of order) {
      const cat = await prisma.category.create({ data: { name } });
      newCats[name] = cat.id;
      console.log(`✅ Created Category: ${name} (ID: ${cat.id})`);
    }

    // 4. 물품들을 다시 새 카테고리에 매핑
    // (CSV 로직과 동일하게 이름으로 매핑)
    // sheet.csv 정보를 기반으로 각 물품 ID 범위에 맞춰 업데이트
    
    // 행사 (1~11)
    await prisma.item.updateMany({ where: { id: { gte: 1, lte: 11 } }, data: { categoryId: newCats['행사'] } });
    // 체육 (12~22)
    await prisma.item.updateMany({ where: { id: { gte: 12, lte: 22 } }, data: { categoryId: newCats['체육'] } });
    // 음향기기 (23~35)
    await prisma.item.updateMany({ where: { id: { gte: 23, lte: 35 } }, data: { categoryId: newCats['음향기기'] } });
    // 기타 (36~53)
    await prisma.item.updateMany({ where: { id: { gte: 36, lte: 53 } }, data: { categoryId: newCats['기타'] } });

    // 5. 임시 카테고리 삭제
    await prisma.category.delete({ where: { id: tempCat.id } });

    console.log('🏁 Category re-ordering completed!');

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
run();
