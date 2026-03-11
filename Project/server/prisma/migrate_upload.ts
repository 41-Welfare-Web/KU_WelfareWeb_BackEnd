import { PrismaClient, ManagementType } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

const DATA_DIR = path.join('D:', 'Git', 'RentalWeb', 'Project', 'data', '20260309_Item_Image');
const BUCKET_NAME = process.env.SUPABASE_BUCKET_NAME || 'rental-web';

async function migrateAndUpload() {
  console.log('🚀 Starting Comprehensive Migration & Upload...');

  try {
    // 1. 카테고리별 접두사 설정
    const prefixMap: Record<number, number> = { 
      26: 100, // 행사
      28: 200, // 음향 (사용자 요청)
      27: 300, // 체육
      29: 400  // 기타
    };

    // 2. 모든 물품 정보 가져오기
    const items = await prisma.item.findMany({ 
      orderBy: { id: 'asc' },
      include: { category: true } 
    });

    const idToNewCode: Record<number, string> = {};
    const categoryCounters: Record<number, number> = {};

    // 3. DB 코드 업데이트
    console.log('📝 Updating Item Codes in DB...');
    for (const item of items) {
      const prefix = prefixMap[item.categoryId] || 900;
      if (!categoryCounters[item.categoryId]) {
        categoryCounters[item.categoryId] = prefix + 1;
      } else {
        categoryCounters[item.categoryId]++;
      }

      const newCode = categoryCounters[item.categoryId].toString();
      idToNewCode[item.id] = newCode;

      await prisma.item.update({
        where: { id: item.id },
        data: { itemCode: newCode }
      });
      console.log(`✅ Item ID ${item.id} [${item.name}]: ${item.itemCode} -> ${newCode}`);
    }

    // 4. 기존 ItemImage 데이터 초기화 (중복 방지)
    console.log('🧹 Clearing old ItemImage records...');
    await prisma.itemImage.deleteMany({});

    // 5. 파일 이름 변경 및 업로드
    console.log('🖼️  Processing files (Rename & Upload)...');
    const files = fs.readdirSync(DATA_DIR);
    
    // 파일을 {itemId: [files...]} 형태로 그룹화
    const itemFiles: Record<number, string[]> = {};
    for (const file of files) {
      if (!file.endsWith('.jpg')) continue;
      const match = file.match(/^(\d+)_(\d+)\.jpg$/);
      if (!match) continue;
      
      const oldId = parseInt(match[1]);
      if (!itemFiles[oldId]) itemFiles[oldId] = [];
      itemFiles[oldId].push(file);
    }

    for (const oldId of Object.keys(itemFiles).map(Number)) {
      const newCode = idToNewCode[oldId];
      if (!newCode) continue;

      // 정렬 (1, 2, 3... 순서 유지)
      const filesForThisItem = itemFiles[oldId].sort();
      
      let firstUploadedUrl: string | null = null;

      for (const oldFileName of filesForThisItem) {
        const indexMatch = oldFileName.match(/_(\d+)\.jpg$/);
        const index = indexMatch ? parseInt(indexMatch[1]) : 1;
        
        const newFileName = `${newCode}_${index}.jpg`;
        const oldPath = path.join(DATA_DIR, oldFileName);
        const newPath = path.join(DATA_DIR, newFileName);

        // A. 물리적 파일 이름 변경
        if (fs.existsSync(oldPath)) {
          fs.renameSync(oldPath, newPath);
          console.log(`📁 Renamed: ${oldFileName} -> ${newFileName}`);
        }

        // B. Supabase 업로드
        console.log(`📤 Uploading ${newFileName} to Supabase...`);
        const fileBuffer = fs.readFileSync(newPath);
        const storagePath = `items/${newFileName}`;
        
        const { error } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(storagePath, fileBuffer, {
            contentType: 'image/jpeg',
            upsert: true
          });

        if (error) {
          console.error(`❌ Upload failed for ${newFileName}:`, error.message);
          continue;
        }

        const { data: publicUrlData } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(storagePath);
        
        const publicUrl = publicUrlData.publicUrl;

        // C. DB에 이미지 정보 저장
        await prisma.itemImage.create({
          data: {
            itemId: oldId,
            imageUrl: publicUrl,
            order: index
          }
        });

        if (index === 1) {
          firstUploadedUrl = publicUrl;
        }
      }

      // D. 물품의 대표 이미지 URL 업데이트
      if (firstUploadedUrl) {
        await prisma.item.update({
          where: { id: oldId },
          data: { imageUrl: firstUploadedUrl }
        });
        console.log(`⭐ Updated main image for Item ${newCode}`);
      }
    }

    console.log('🏁 Comprehensive Migration & Upload Completed Successfully!');

  } catch (error) {
    console.error('💥 Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateAndUpload();
