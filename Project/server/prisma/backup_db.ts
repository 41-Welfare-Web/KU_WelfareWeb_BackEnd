import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function backup() {
  console.log('🚀 DB 백업 시작...');
  
  const today = new Date().toISOString().split('T')[0];
  const backupDir = path.join(process.cwd(), 'backups', today);

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const models = [
    'user',
    'category',
    'item',
    'itemInstance',
    'itemImage',
    'itemComponent',
    'rental',
    'rentalItem',
    'rentalHistory',
    'plotterOrder',
    'plotterOrderHistory',
    'configuration',
    'holiday',
    'auditLog',
    'verificationCode',
  ];

  for (const model of models) {
    try {
      // @ts-ignore
      const data = await prisma[model].findMany();
      const filePath = path.join(backupDir, `${model}.json`);
      
      fs.writeFileSync(
        filePath,
        JSON.stringify(
          data,
          (key, value) => (typeof value === 'bigint' ? value.toString() : value),
          2
        )
      );
      console.log(`✅ ${model}: ${data.length}개의 레코드 백업 완료`);
    } catch (e: any) {
      console.error(`❌ ${model} 백업 실패:`, e.message);
    }
  }

  console.log(`\n📂 백업 완료 위치: ${backupDir}`);
}

backup()
  .catch((e) => {
    console.error('❌ 백업 중 치명적 오류 발생:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
