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
      departmentType: '기타',
      departmentName: '운영국',
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
    { key: 'plotter_pickup_delay_days', value: '2', desc: '플로터 신청 후 수령까지 걸리는 근무일 수' },
    { key: 'verification_code_ttl_minutes', value: '5', desc: '인증번호 유효 시간 (분)' },
    { key: 'plotter_price_a0', value: '5000', desc: 'A0 용지 인쇄 단가 (원)' },
    { key: 'plotter_price_a1', value: '3000', desc: 'A1 용지 인쇄 단가 (원)' },
    { key: 'plotter_free_departments', value: '중앙동아리,중앙자치기구', desc: '무료 인쇄 대상 소속 단위 (쉼표 구분)' },
    { key: 'plotter_free_purposes', value: '예산안 출력,동아리 행사', desc: '무료 인쇄 대상 목적 (쉼표 구분)' },
    { key: 'plotter_departments_list', value: '총학생회,중앙자치기구,단과대,학과,중앙동아리,단과대동아리,학과동아리,기타', desc: '서비스 이용 가능 소속 단위 리스트 (쉼표 구분)' },
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
