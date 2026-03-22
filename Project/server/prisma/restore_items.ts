import { PrismaClient, ManagementType } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const BACKUP_DIR = path.join(__dirname, '..', 'backups', '2026-03-15');

async function restoreItems() {
  console.log('🚀 물품 데이터 복구 시작 (JSON 백업 기반)...');

  try {
    // 1. 카테고리 복구
    const categories = JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, 'category.json'), 'utf-8'));
    console.log(`📂 카테고리 ${categories.length}개 복구 중...`);
    for (const cat of categories) {
      await prisma.category.upsert({
        where: { id: cat.id },
        update: { name: cat.name },
        create: { id: cat.id, name: cat.name },
      });
    }

    // 2. 물품 복구
    const items = JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, 'item.json'), 'utf-8'));
    console.log(`📦 물품 ${items.length}개 복구 중...`);
    for (const item of items) {
      await prisma.item.upsert({
        where: { id: item.id },
        update: {
          name: item.name,
          categoryId: item.categoryId,
          itemCode: item.itemCode,
          description: item.description,
          rentalCount: item.rentalCount,
          imageUrl: item.imageUrl,
          videoUrl: item.videoUrl,
          managementType: item.managementType as ManagementType,
          totalQuantity: item.totalQuantity,
        },
        create: {
          id: item.id,
          name: item.name,
          categoryId: item.categoryId,
          itemCode: item.itemCode,
          description: item.description,
          rentalCount: item.rentalCount,
          imageUrl: item.imageUrl,
          videoUrl: item.videoUrl,
          managementType: item.managementType as ManagementType,
          totalQuantity: item.totalQuantity,
        },
      });
    }

    // 3. (추가) 물품 인스턴스 복구 (개별 관리 물품인 경우)
    const instancePath = path.join(BACKUP_DIR, 'itemInstance.json');
    if (fs.existsSync(instancePath)) {
      const instances = JSON.parse(fs.readFileSync(instancePath, 'utf-8'));
      if (instances.length > 0) {
          console.log(`🔧 물품 인스턴스 ${instances.length}개 복구 중...`);
          for (const inst of instances) {
            await prisma.itemInstance.upsert({
              where: { id: inst.id },
              update: {
                itemId: inst.itemId,
                serialNumber: inst.serialNumber,
                status: inst.status,
              },
              create: {
                id: inst.id,
                itemId: inst.itemId,
                serialNumber: inst.serialNumber,
                status: inst.status,
              },
            });
          }
      }
    }

    console.log('🏁 복구 완료!');
  } catch (error) {
    console.error('💥 복구 중 오류 발생:', error);
  } finally {
    await prisma.$disconnect();
  }
}

restoreItems();
