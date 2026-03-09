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
const CSV_PATH = path.join(DATA_DIR, 'sheet.csv');
const BUCKET_NAME = process.env.SUPABASE_BUCKET_NAME || 'rental-web';

async function importItems() {
  console.log('🚀 Starting Item Import...');

  try {
    const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
    const lines = csvContent.split('\n');
    
    // Skip headers (first 4 lines are metadata/headers)
    const dataLines = lines.slice(4);
    
    let currentCategory = '';
    const categoryMap: Record<string, number> = {};

    for (const line of dataLines) {
      if (!line.trim()) continue;
      
      const parts = line.split(',');
      if (parts.length < 4) continue;

      let categoryName = parts[0].trim();
      const idStr = parts[1].trim();
      const name = parts[2].trim();
      const totalQtyStr = parts[3].trim();

      if (!idStr || isNaN(Number(idStr))) continue;

      // Update current category if provided
      if (categoryName) {
        currentCategory = categoryName;
      } else {
        categoryName = currentCategory;
      }

      if (!categoryName) continue;

      // 1. Ensure Category exists
      if (!categoryMap[categoryName]) {
        const cat = await prisma.category.upsert({
          where: { name: categoryName },
          update: {},
          create: { name: categoryName },
        });
        categoryMap[categoryName] = cat.id;
        console.log(`✅ Category [${categoryName}] ready (ID: ${cat.id})`);
      }

      const categoryId = categoryMap[categoryName];
      const totalQuantity = parseInt(totalQtyStr) || 0;
      const itemId = parseInt(idStr);
      const itemCode = `ITEM-${itemId.toString().padStart(3, '0')}`;

      // 2. Upload Image if exists
      let imageUrl: string | null = null;
      const imagePath = path.join(DATA_DIR, `${itemId}_1.jpg`);
      
      if (fs.existsSync(imagePath)) {
        const fileBuffer = fs.readFileSync(imagePath);
        const fileName = `items/${itemId}_${Date.now()}.jpg`;
        
        const { data, error } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(fileName, fileBuffer, {
            contentType: 'image/jpeg',
            upsert: true
          });

        if (error) {
          console.error(`❌ Failed to upload image for ${name}:`, error.message);
        } else {
          const { data: publicUrlData } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(fileName);
          imageUrl = publicUrlData.publicUrl;
          console.log(`📸 Image uploaded for [${name}]: ${imageUrl}`);
        }
      }

      // 3. Create Item
      // Use INDIVIDUAL for small quantities (<= 2) or specific items, BULK for others
      // Actually, based on the sheet, most are BULK style. 
      // Let's decide: if totalQty > 1, use BULK. If 1, could be INDIVIDUAL.
      // But for this welfare service, BULK is easier for many small items.
      const managementType: ManagementType = totalQuantity > 1 ? 'BULK' : 'INDIVIDUAL';

      await prisma.item.create({
        data: {
          id: itemId,
          categoryId,
          name,
          itemCode,
          totalQuantity,
          managementType,
          imageUrl,
          description: `${categoryName} 물품 - ${name}`,
        }
      });

      // 4. Create Instances if INDIVIDUAL
      if (managementType === 'INDIVIDUAL') {
        await prisma.itemInstance.create({
          data: {
            itemId,
            serialNumber: `${itemCode}-01`,
            status: 'AVAILABLE'
          }
        });
      }

      console.log(`📦 Item [${name}] created.`);
    }

    console.log('🏁 Import Completed Successfully!');

  } catch (error) {
    console.error('💥 Error during import:', error);
  } finally {
    await prisma.$disconnect();
  }
}

importItems();
