import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

// 2026년 대한민국 법정 공휴일 (평일만 — 주말은 시스템이 자동 처리)
// 주의: 제헌절(7/17)은 공휴일 재지정 법안 기준. 미확정 시 해당 줄 제거 필요.
const HOLIDAYS_2026: { date: string; description: string }[] = [
  { date: '2026-01-01', description: '신정' },
  { date: '2026-02-16', description: '설날 연휴' },
  { date: '2026-02-17', description: '설날' },
  { date: '2026-02-18', description: '설날 연휴' },
  { date: '2026-03-02', description: '대체공휴일 (삼일절)' },   // 3/1 일요일
  { date: '2026-05-05', description: '어린이날' },
  { date: '2026-05-25', description: '대체공휴일 (부처님오신날)' }, // 5/24 일요일
  { date: '2026-06-03', description: '지방선거 임시공휴일' },
  { date: '2026-07-17', description: '제헌절' },               // 공휴일 재지정 법안 기준
  { date: '2026-08-17', description: '대체공휴일 (광복절)' },    // 8/15 토요일
  { date: '2026-09-24', description: '추석 연휴' },
  { date: '2026-09-25', description: '추석' },
  { date: '2026-10-05', description: '대체공휴일 (개천절)' },    // 10/3 토요일
  { date: '2026-10-09', description: '한글날' },
  { date: '2026-12-25', description: '크리스마스' },
];

async function main() {
  console.log(`\n2026년 공휴일 등록 시작 (총 ${HOLIDAYS_2026.length}건)\n`);

  let inserted = 0;
  let skipped = 0;

  for (const h of HOLIDAYS_2026) {
    const date = new Date(h.date + 'T00:00:00.000Z');

    const existing = await prisma.holiday.findUnique({
      where: { holidayDate: date },
    });

    if (existing) {
      console.log(`[SKIP]   ${h.date} — ${h.description} (이미 등록됨)`);
      skipped++;
      continue;
    }

    await prisma.holiday.create({
      data: {
        holidayDate: date,
        description: h.description,
      },
    });

    console.log(`[등록]   ${h.date} — ${h.description}`);
    inserted++;
  }

  console.log(`\n완료: ${inserted}건 등록, ${skipped}건 스킵`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
