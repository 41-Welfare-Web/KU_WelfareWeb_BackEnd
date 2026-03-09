import { PrismaClient, InstanceStatus, ManagementType } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  try {
    // 1. 천막 (ID: 1) 처리
    await prisma.item.update({
      where: { id: 1 },
      data: { managementType: ManagementType.INDIVIDUAL }
    });
    
    // 기존 인스턴스 중복 생성 방지를 위해 체크
    const count = await prisma.itemInstance.count({ where: { itemId: 1 } });
    if (count === 0) {
      const instances = Array.from({ length: 16 }, (_, i) => ({
        itemId: 1,
        serialNumber: `ITEM-001-${(i + 1).toString().padStart(2, '0')}`,
        status: InstanceStatus.AVAILABLE
      }));
      await prisma.itemInstance.createMany({ data: instances });
    }
    console.log('SUCCESS: Tent updated.');
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
run();
