import { PrismaClient, InstanceStatus, ManagementType } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const itemsToUpdate = [
    { id: 23, name: '유선마이크', qty: 10, code: 'ITEM-023' },
    { id: 24, name: '무선마이크', qty: 15, code: 'ITEM-024' },
    { id: 25, name: '무선마이크(송수신기)', qty: 4, code: 'ITEM-025' },
    { id: 26, name: '송수신기', qty: 2, code: 'ITEM-026' },
    { id: 27, name: '마이크스탠드', qty: 4, code: 'ITEM-027' },
    { id: 28, name: '대형 무선 앰프', qty: 6, code: 'ITEM-028' },
    { id: 29, name: '소형 무선 앰프', qty: 6, code: 'ITEM-029' },
    { id: 31, name: '기가폰', qty: 2, code: 'ITEM-031' }
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
