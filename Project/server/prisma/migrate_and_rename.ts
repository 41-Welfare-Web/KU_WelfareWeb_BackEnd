import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const DATA_DIR = path.join('D:', 'Git', 'RentalWeb', 'Project', 'data', '20260309_Item_Image');

async function migrate() {
  console.log('🚀 Starting Migration...');

  // 1. Get all items and categories
  const categories = await prisma.category.findMany({ orderBy: { id: 'asc' } });
  // Map user preferred categories to prefixes:
  // ID 26: 행사 -> 100
  // ID 28: 음향 -> 200 (User specified)
  // ID 27: 체육 -> 300
  // ID 29: 기타 -> 400
  const prefixMap: Record<number, number> = { 26: 100, 28: 200, 27: 300, 29: 400 };

  const items = await prisma.item.findMany({ orderBy: { id: 'asc' } });
  const idToNewCode: Record<number, string> = {};
  const categoryCounters: Record<number, number> = {};

  // 2. Calculate New Codes and Update DB
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
    console.log(`✅ Item ID ${item.id}: ${item.itemCode} -> ${newCode}`);
  }

  // 3. Rename Files and Reflect in DB (ItemImage)
  console.log('🖼️  Renaming image files and updating ItemImage table...');
  const files = fs.readdirSync(DATA_DIR);

  for (const file of files) {
    if (!file.endsWith('.jpg')) continue;

    // Pattern: {old_id}_{index}.jpg
    const match = file.match(/^(\d+)_(\d+)\.jpg$/);
    if (!match) continue;

    const oldId = parseInt(match[1]);
    const index = parseInt(match[2]);
    const newCode = idToNewCode[oldId];

    if (newCode) {
      const oldPath = path.join(DATA_DIR, file);
      const newFileName = `${newCode}_${index}.jpg`;
      const newPath = path.join(DATA_DIR, newFileName);

      // Rename physical file
      if (fs.existsSync(oldPath)) {
        fs.renameSync(oldPath, newPath);
        console.log(`📁 Renamed: ${file} -> ${newFileName}`);
      }

      // Record in ItemImage Table (using a placeholder URL or relative path for now)
      // Since actual upload depends on Supabase, we create records that can be matched.
      // Assuming they will be uploaded to /items/{newCode}_{index}.jpg
      const imageUrl = `https://placeholder-url-for-later-upload/${newFileName}`;

      await prisma.itemImage.create({
        data: {
          itemId: oldId,
          imageUrl: imageUrl, // Temporary URL, will need actual upload later or as part of this.
          order: index
        }
      });
    }
  }

  console.log('🏁 Migration Completed!');
}

migrate()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
