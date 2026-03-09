import { PrismaClient, InstanceStatus, ManagementType } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const itemsToUpdate = [
    { id: 36, name: '구르마(소형)', qty: 4, code: 'ITEM-036' },
    { id: 37, name: '구르마(대형)', qty: 5, code: 'ITEM-037' },
    { id: 38, name: '리드선', qty: 8, code: 'ITEM-038' },
    { id: 43, name: '빔프로젝터', qty: 4, code: 'ITEM-043' },
    { id: 45, name: '화이트보드', qty: 2, code: 'ITEM-045' },
    { id: 46, name: '몰카탐지기', qty: 8, code: 'ITEM-046' },
    { id: 51, name: '폴라로이드 카메라', qty: 2, code: 'ITEM-051' },
    { id: 50, name: '대용량 보조배터리', qty: 1, code: 'ITEM-050' },
    { id: 44, name: '빔스크린', qty: 1, code: 'ITEM-044' }
  ];

  try {
    for (const item of itemsToUpdate) {
      await prisma.item.update({
        where: { id: item.id },
        data: { managementType: ManagementType.INDIVIDUAL }
      });
      
      const count = await prisma.itemInstance.count({ where: { itemId: item.id } });
      if (count === 0) {
        const instances = Array.from({ length: item.qty }, (_, i) => ({
          itemId: item.id,
          serialNumber: `${item.code}-${(i + 1).toString().padStart(2, '0')}`,
          status: InstanceStatus.AVAILABLE
        }));
        await prisma.itemInstance.createMany({ data: instances });
      }
      console.log(`✅ Updated [${item.name}] to INDIVIDUAL.`);
    }
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
run();
