import { PrismaClient, InstanceStatus, ManagementType } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const itemsToUpdate = [
    { id: 22, name: '아이스박스', qty: 2, code: 'ITEM-022' }
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
