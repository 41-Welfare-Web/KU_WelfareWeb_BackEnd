import { PrismaClient, ManagementType } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function processManagementType() {
  try {
    // 1. 현재 INDIVIDUAL 물품 리스트 추출 및 저장
    const indItems = await prisma.item.findMany({
      where: { managementType: ManagementType.INDIVIDUAL },
      orderBy: { id: 'asc' }
    });

    let docContent = '# Item Management History (INDIVIDUAL 설정 이력)\n\n';
    docContent += `기록 일시: ${new Date().toLocaleString()}\n\n`;
    docContent += '추후 업데이트 시 개별 관리(INDIVIDUAL)로 전환을 검토했던 물품 리스트입니다.\n\n';
    docContent += '| ID | 물품명 | 코드 | 현재 수량 |\n| :--- | :--- | :--- | :--- |\n';
    
    indItems.forEach(i => {
      docContent += `| ${i.id} | ${i.name} | ${i.itemCode} | ${i.totalQuantity} |\n`;
    });

    const docPath = path.join('D:', 'Git', 'RentalWeb', 'Document', 'Item_Management_History.md');
    fs.writeFileSync(docPath, docContent, 'utf-8');
    console.log(`✅ Documentation saved to: ${docPath}`);

    // 2. 전체 물품을 BULK로 전환
    console.log('🔄 Converting all items to BULK...');
    await prisma.item.updateMany({
      data: { managementType: ManagementType.BULK }
    });

    // 3. 기존 개별 실물(Instance) 데이터 삭제 (데이터 정합성 유지)
    console.log('🧹 Cleaning up old ItemInstances...');
    await prisma.itemInstance.deleteMany({});

    console.log('🏁 All items are now set to BULK management type.');

  } catch (e) {
    console.error('💥 Error during process:', e);
  } finally {
    await prisma.$disconnect();
  }
}

processManagementType();
