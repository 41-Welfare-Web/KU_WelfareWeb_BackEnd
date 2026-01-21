import { PrismaClient, Role, ManagementType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 데이터 시딩 시작...');

  // 1. 관리자 계정 생성
  const adminPassword = await bcrypt.hash('admin123!', 10);
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: adminPassword,
      name: '관리자',
      studentId: '00000000',
      phoneNumber: '010-0000-0000',
      department: '운영국',
      role: Role.ADMIN,
    },
  });
  console.log('✅ 관리자 계정 생성 완료 (ID: admin / PW: admin123!)');

  // 2. 카테고리 생성
  const categories = ['촬영장비', '음향장비', '체육용품', '사무기기'];
  for (const name of categories) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log('✅ 카테고리 생성 완료');

  // 3. 물품 생성
  const category = await prisma.category.findFirst({ where: { name: '촬영장비' } });
  if (category) {
    await prisma.item.upsert({
      where: { itemCode: 'CAM-001' },
      update: {},
      create: {
        name: 'DSLR 카메라',
        itemCode: 'CAM-001',
        categoryId: category.id,
        managementType: ManagementType.INDIVIDUAL,
        totalQuantity: 5,
        description: '캐논 80D 고성능 카메라입니다.',
      },
    });
  }
  console.log('✅ 물품 생성 완료');

  // 4. 시스템 설정 생성
  const configs = [
    { key: 'rental_max_period_months', value: '2', desc: '최대 대여 가능 기간 (개월)' },
    { key: 'login_attempt_limit', value: '5', desc: '로그인 시도 횟수 제한' },
  ];
  for (const config of configs) {
    await prisma.configuration.upsert({
      where: { configKey: config.key },
      update: {},
      create: {
        configKey: config.key,
        configValue: config.value,
        description: config.desc,
      },
    });
  }
  console.log('✅ 시스템 설정 생성 완료');

  console.log('🏁 시딩 완료!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
