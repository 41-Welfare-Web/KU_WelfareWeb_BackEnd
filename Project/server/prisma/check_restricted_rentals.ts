import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 1. Rental의 memo(비고)에 관련 내용이 있는 예약 검색
  const rentalsWithMemo = await prisma.rental.findMany({
    where: {
      OR: [
        { memo: { contains: '축제' } },
        { memo: { contains: '불가' } }
      ],
      status: 'RESERVED'
    },
    include: {
      user: { select: { name: true } },
      rentalItems: {
        include: { item: { select: { name: true, description: true } } }
      }
    }
  });

  // 2. Item의 description(설명)에 '축제'나 '불가'가 포함된 물품이 포함된 예약 검색
  const rentalsWithRestrictedItems = await prisma.rental.findMany({
    where: {
      status: 'RESERVED',
      rentalItems: {
        some: {
          item: {
            OR: [
              { description: { contains: '축제' } },
              { description: { contains: '불가' } }
            ]
          }
        }
      }
    },
    include: {
      user: { select: { name: true } },
      rentalItems: {
        include: { item: { select: { name: true, description: true } } }
      }
    }
  });

  console.log('--- [1] Rental Memo에 키워드가 포함된 예약 ---');
  console.log(JSON.stringify(rentalsWithMemo, null, 2));

  console.log('\n--- [2] 대여 불가 물품 설명이 포함된 아이템의 예약 ---');
  // 중복 제거를 위해 ID 기준으로 필터링하여 출력
  const memoIds = new Set(rentalsWithMemo.map(r => r.id));
  const uniqueRestrictedItems = rentalsWithRestrictedItems.filter(r => !memoIds.has(r.id));
  console.log(JSON.stringify(uniqueRestrictedItems, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
