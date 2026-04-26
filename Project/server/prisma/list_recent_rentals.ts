import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const recentRentals = await prisma.rental.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: { name: true, studentId: true }
      },
      rentalItems: {
        include: {
          item: {
            select: { name: true }
          }
        }
      }
    }
  });

  console.log(JSON.stringify(recentRentals, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
