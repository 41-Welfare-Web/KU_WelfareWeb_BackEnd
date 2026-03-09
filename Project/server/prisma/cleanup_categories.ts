import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  try {
    // 1. 현재 물품들이 사용 중인 카테고리 ID 추출
    const items = await prisma.item.findMany({
      select: { categoryId: true },
      distinct: ['categoryId'],
    });
    const usedIds = items.map(i => i.categoryId);

    // 2. 사용 중이지 않은 카테고리 삭제
    const deleted = await prisma.category.deleteMany({
      where: {
        id: { notIn: usedIds }
      }
    });

    console.log(`✅ Deleted ${deleted.count} unused categories.`);
    
    // 3. 남은 카테고리 확인
    const remaining = await prisma.category.findMany();
    console.log('--- Remaining Categories ---');
    remaining.forEach(c => console.log(`- [${c.id}] ${c.name}`));

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
run();
