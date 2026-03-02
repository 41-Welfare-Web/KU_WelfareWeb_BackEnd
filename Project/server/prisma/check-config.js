const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanup() {
  // 오래된 키 삭제
  const staleKeys = ['dept_list_단과대', 'dept_list_중앙동아리', 'dept_list_학과'];
  for (const key of staleKeys) {
    await prisma.configuration.delete({ where: { configKey: key } }).catch(() => {});
    console.log('삭제: ' + key);
  }

  // 최종 확인
  console.log('\n=== 최종 configurations ===');
  const configs = await prisma.configuration.findMany({ orderBy: { configKey: 'asc' } });
  for (const c of configs) {
    console.log(c.configKey + ' = ' + c.configValue);
  }
  await prisma.$disconnect();
}

cleanup();
