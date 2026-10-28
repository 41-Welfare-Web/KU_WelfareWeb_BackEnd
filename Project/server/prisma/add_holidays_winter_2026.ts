/**
 * 겨울 대여 휴무 기간 등록 (2026-11-30 ~ 2027-01-15)
 *
 * holidays 테이블은 주말을 등록하지 않는 방식(주말은 운영일 계산에서 자동 제외)이라
 * 평일만 넣습니다.
 *
 * 실행:
 *   npx ts-node prisma/add_holidays_winter_2026.ts           # 미리보기
 *   npx ts-node prisma/add_holidays_winter_2026.ts --apply   # 적용
 */
import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();
const APPLY = process.argv.includes('--apply');

const START = new Date('2026-11-30T00:00:00.000Z');
const END = new Date('2027-01-15T00:00:00.000Z');
const DESCRIPTION = '대여 휴무 기간';
const DOW = ['일', '월', '화', '수', '목', '금', '토'];
const d = (x: Date) => x.toISOString().slice(0, 10);

async function main() {
  const weekdays: Date[] = [];
  let weekendCount = 0;
  for (let t = +START; t <= +END; t += 86400e3) {
    const day = new Date(t);
    if (day.getUTCDay() === 0 || day.getUTCDay() === 6) weekendCount++;
    else weekdays.push(day);
  }

  const existing = await p.holiday.findMany({
    where: { holidayDate: { gte: START, lte: END } },
    select: { holidayDate: true, description: true },
  });
  const have = new Map(existing.map((e) => [d(e.holidayDate), e.description]));

  console.log(`대상 기간: ${d(START)} ~ ${d(END)}`);
  console.log(`평일 ${weekdays.length}일 등록 / 주말 ${weekendCount}일은 자동 휴무라 등록 안 함\n`);

  // 이미 등록된 날은 그대로 둔다 (예: 12/25 '크리스마스' 설명 보존)
  const skipped = weekdays.filter((day) => have.has(d(day)));
  const toCreate = weekdays.filter((day) => !have.has(d(day)));
  if (skipped.length) {
    console.log(`이미 등록돼 있어 건너뛸 ${skipped.length}건 (기존 설명 유지):`);
    skipped.forEach((day) =>
      console.log(`  ${d(day)}(${DOW[day.getUTCDay()]}) "${have.get(d(day))}"`),
    );
    console.log('');
  }

  if (!APPLY) {
    console.log(`등록할 평일 ${toCreate.length}일:`);
    toCreate.forEach((day) => console.log(`  ${d(day)}(${DOW[day.getUTCDay()]})`));
    console.log('\n[DRY-RUN] 변경 없음. 적용하려면 --apply');
    return;
  }

  await p.holiday.createMany({
    data: toCreate.map((day) => ({ holidayDate: day, description: DESCRIPTION })),
    skipDuplicates: true,
  });

  const after = await p.holiday.count({
    where: { holidayDate: { gte: START, lte: END } },
  });
  console.log(`[APPLIED] 평일 ${toCreate.length}일 신규 등록 (기존 ${skipped.length}건은 유지)`);
  console.log(`확인: 기간 내 등록된 휴무일 ${after}건 (평일 ${weekdays.length}일과 일치해야 정상)`);
}

main()
  .catch((e) => {
    console.error('실패:', e.message ?? e);
    process.exit(1);
  })
  .finally(() => p.$disconnect());
