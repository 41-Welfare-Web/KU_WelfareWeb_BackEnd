import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!,
);
const BUCKET = process.env.SUPABASE_BUCKET_NAME!;
const BASE_URL = `${process.env.SUPABASE_URL}/storage/v1/object/public/${BUCKET}`;
const IMAGE_DIR = path.join(__dirname, '..', '..', 'data', '2026_03_23_Item_Image');

function getContentType(filename: string): string {
  return filename.endsWith('.png') ? 'image/png' : 'image/jpeg';
}

// "102_1.jpg" → { itemCode: "102", order: 1 }
function parseFilename(filename: string): { itemCode: string; order: number } | null {
  const match = filename.match(/^(\d+)_(\d+)\.(jpg|png)$/);
  if (!match) return null;
  return { itemCode: match[1], order: parseInt(match[2], 10) };
}

async function uploadImages() {
  console.log('📤 Supabase Storage 이미지 업로드 시작...');

  const files = fs.readdirSync(IMAGE_DIR).filter((f) => f.endsWith('.jpg') || f.endsWith('.png'));
  let uploaded = 0;
  let failed = 0;

  for (const filename of files) {
    const filePath = path.join(IMAGE_DIR, filename);
    const fileBuffer = fs.readFileSync(filePath);
    const storagePath = `items/${filename}`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: getContentType(filename),
        upsert: true,
      });

    if (error) {
      console.error(`  ❌ ${filename}: ${error.message}`);
      failed++;
    } else {
      console.log(`  ✅ ${filename}`);
      uploaded++;
    }
  }

  console.log(`\n📊 업로드 결과: 성공 ${uploaded}개, 실패 ${failed}개 (전체 ${files.length}개)`);
}

async function restoreItemImages() {
  console.log('\n🗄️  DB itemImages 복구 시작 (파일명 패턴 기반)...');

  // itemCode → itemId 매핑 테이블 생성
  const items = await prisma.item.findMany({ select: { id: true, itemCode: true, name: true } });
  const codeToItem = new Map(items.map((i) => [i.itemCode, i]));

  const files = fs
    .readdirSync(IMAGE_DIR)
    .filter((f) => f.endsWith('.jpg') || f.endsWith('.png'))
    .sort(); // 순서 보장 (101_1 → 101_2 순)

  let restored = 0;
  let skipped = 0;
  let failed = 0;

  for (const filename of files) {
    const parsed = parseFilename(filename);
    if (!parsed) {
      console.log(`  ⚠️  ${filename}: 파일명 패턴 불일치, 건너뜀`);
      skipped++;
      continue;
    }

    const item = codeToItem.get(parsed.itemCode);
    if (!item) {
      console.log(`  ⚠️  ${filename}: itemCode ${parsed.itemCode} DB에 없음, 건너뜀`);
      skipped++;
      continue;
    }

    const imageUrl = `${BASE_URL}/items/${filename}`;

    try {
      // 동일 itemId + order가 있으면 update, 없으면 create
      const existing = await prisma.itemImage.findFirst({
        where: { itemId: item.id, order: parsed.order },
      });

      if (existing) {
        await prisma.itemImage.update({
          where: { id: existing.id },
          data: { imageUrl },
        });
      } else {
        await prisma.itemImage.create({
          data: { itemId: item.id, imageUrl, order: parsed.order },
        });
      }

      console.log(`  ✅ ${item.name}(${parsed.itemCode}) 순서 ${parsed.order}: ${filename}`);
      restored++;
    } catch (e: any) {
      console.error(`  ❌ ${filename}: ${e.message}`);
      failed++;
    }
  }

  console.log(`\n📊 DB 복구 결과: 성공 ${restored}개, 건너뜀 ${skipped}개, 실패 ${failed}개`);
}

async function updateItemImageUrls() {
  console.log('\n🖼️  items.imageUrl 업데이트 (order=1 기준)...');

  // order=1 이미지를 대표 imageUrl로 설정
  const firstImages = await prisma.itemImage.findMany({ where: { order: 1 } });
  let updated = 0;

  for (const img of firstImages) {
    await prisma.item.update({
      where: { id: img.itemId },
      data: { imageUrl: img.imageUrl },
    });
    updated++;
  }

  console.log(`  ✅ ${updated}개 물품 imageUrl 업데이트 완료`);
}

async function main() {
  console.log('==============================================');
  console.log('🚀 이미지 업로드 및 DB 복구 시작');
  console.log('==============================================\n');

  try {
    await uploadImages();
    await restoreItemImages();
    await updateItemImageUrls();
    console.log('\n✨ 모든 작업 완료!');
  } catch (error) {
    console.error('💥 오류 발생:', error);
  } finally {
    await prisma.$disconnect();
    console.log('==============================================');
  }
}

main();
