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
    { key: 'plotter_price_a0', value: '2000', desc: 'A0 용지 인쇄 단가 (원)' },
    { key: 'plotter_price_a1', value: '1500', desc: 'A1 용지 인쇄 단가 (원)' },
    { key: 'plotter_free_departments', value: '중앙동아리,중앙자치기구', desc: '무료 인쇄 대상 소속 단위 (쉼표 구분)' },
    { key: 'plotter_purposes', value: '회칙 명시 사항 인쇄(예산안 등),학과 행사 목적,동아리 홍보물,기타', desc: '플로터 인쇄 목적 전체 리스트 (쉼표 구분)' },
    { key: 'plotter_free_purposes', value: '회칙 명시 사항 인쇄(예산안 등),학과 행사 목적', desc: '무료 인쇄 대상 목적 (쉼표 구분)' },
    { key: 'plotter_departments_list', value: '총학생회,중앙자치기구,문과대학,이과대학,공과대학,건축대학,경영대학,사회과학대학,생명과학대학,융합과학기술원,부동산과학원,사범대학,수의과대학,상허교양대학,예술디자인대학,중앙동아리,단과대동아리,학과동아리,기타', desc: '서비스 이용 가능 소속 단위 리스트 (쉼표 구분)' },
    { key: 'dept_list_중앙자치기구', value: '중앙자치기구,건국문화예술학생연합,동아리연합회,졸업준비위원회,학생복지위원회', desc: '중앙자치기구 세부 목록' },
    { key: 'dept_list_문과대학', value: '문과대학,국어국문학과,영어영문학과,중어중문학과,철학과,사학과,지리학과,미디어커뮤니케이션학과,문화콘텐츠학과,문과대학자유전공학부', desc: '문과대학 학과 목록' },
    { key: 'dept_list_이과대학', value: '이과대학,수학과,화학과,물리학과,이과대학자유전공학부', desc: '이과대학 학과 목록' },
    { key: 'dept_list_공과대학', value: '공과대학,사회환경공학부,기계항공공학부,전기전자공학부,화학공학부,컴퓨터공학부,산업경영공학부 산업공학과,산업경영공학부 신산업융합학과,생물공학과,K뷰티산업융합학과', desc: '공과대학 학과 목록' },
    { key: 'dept_list_경영대학', value: '경영대학,경영학과,기술경영학과', desc: '경영대학 학과 목록' },
    { key: 'dept_list_사회과학대학', value: '사회과학대학,정치외교학과,경제학과,행정학과,국제무역학과,응용통계학과,융합인재학과,글로벌비즈니스학과', desc: '사회과학대학 학과 목록' },
    { key: 'dept_list_생명과학대학', value: '생명과학대학,생명과학특성학과,동물자원과학과,동물자원전공,식량자원과학과,축산식품생명공학과,식품유통공학과,식품유통전공,식품과학전공,환경보건과학과,환경보건전공,산림조경학과,산림조경전공,생명과학대학자유전공학부', desc: '생명과학대학 학과 목록' },
    { key: 'dept_list_융합과학기술원', value: '융합과학기술원,미래에너지공학과,스마트운행체공학과,스마트ICT융합공학과,화장품공학과,줄기세포재생공학과,의생명공학과,첨단바이오공학부,시스템생명공학과,융합생명공학과', desc: '융합과학기술원 학과 목록' },
    { key: 'dept_list_부동산과학원', value: '부동산과학원,부동산학과', desc: '부동산과학원 학과 목록' },
    { key: 'dept_list_사범대학', value: '사범대학,일어교육과,수학교육과,체육교육과,음악교육과,교육공학과,영어교육과', desc: '사범대학 학과 목록' },
    { key: 'dept_list_수의과대학', value: '수의과대학,수의예과,수의학과', desc: '수의과대학 학과 목록' },
    { key: 'dept_list_상허교양대학', value: '상허교양대학,KU자유전공학부', desc: '상허교양대학 학과 목록' },
    { key: 'dept_list_예술디자인대학', value: '예술디자인대학,커뮤니케이션디자인학과,산업디자인학과,의상디자인학과,리빙디자인학과,현대미술학과,영상학과,매체연기학과', desc: '예술디자인대학 학과 목록' },
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
