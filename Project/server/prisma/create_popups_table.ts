/**
 * popups 테이블만 생성하는 스크립트
 * db push 대신 사용 (rentals.status 컬럼 건드리지 않음)
 *
 * 실행: npx ts-node prisma/create_popups_table.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "popups" (
      "id"         SERIAL PRIMARY KEY,
      "title"      VARCHAR(100) NOT NULL,
      "content"    TEXT,
      "image_url"  TEXT,
      "start_date" DATE NOT NULL,
      "end_date"   DATE NOT NULL,
      "is_active"  BOOLEAN NOT NULL DEFAULT true,
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  console.log('✅ popups 테이블 생성 완료');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
