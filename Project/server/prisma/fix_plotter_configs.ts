import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const freeDepts = '학과 학생회, 단과대 학생회, 중앙자치기구, 중앙동아리, 총학생회, 자치기구';
  const freePurposes = '예산안 출력, 회칙 인쇄, 회칙명시사항 인쇄, 행사 홍보, 회칙 명시 사항 인쇄(예산안 등)';

  await prisma.configuration.upsert({
    where: { configKey: 'plotter_free_departments' },
    update: { configValue: freeDepts },
    create: { configKey: 'plotter_free_departments', configValue: freeDepts },
  });

  await prisma.configuration.upsert({
    where: { configKey: 'plotter_free_purposes' },
    update: { configValue: freePurposes },
    create: { configKey: 'plotter_free_purposes', configValue: freePurposes },
  });

  console.log('✅ Plotter configurations updated successfully.');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
