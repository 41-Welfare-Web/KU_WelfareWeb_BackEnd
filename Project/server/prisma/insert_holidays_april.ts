import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

// 2026년 4월 13일~30일 재실 중단 (평일만 — 주말 18,19,25,26일은 자동 처리)
const DATES = [13, 14, 15, 16, 17, 20, 21, 22, 23, 24, 27, 28, 29, 30];

async function main() {
  console.log(`\n4월 재실 중단 등록 시작 (총 ${DATES.length}건)\n`);
  let inserted = 0;
  let skipped = 0;

  for (const d of DATES) {
    const dateStr = `2026-04-${String(d).padStart(2, '0')}`;
    const date = new Date(dateStr + 'T00:00:00.000Z');

    const existing = await prisma.holiday.findUnique({ where: { holidayDate: date } });
    if (existing) {
      console.log(`[SKIP]   ${dateStr} — 이미 등록됨`);
      skipped++;
      continue;
    }

    await prisma.holiday.create({
      data: { holidayDate: date, description: '재실 중단' },
    });
    console.log(`[등록]   ${dateStr} — 재실 중단`);
    inserted++;
  }

  console.log(`\n완료: ${inserted}건 등록, ${skipped}건 스킵`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
