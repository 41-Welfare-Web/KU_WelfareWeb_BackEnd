import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

const descriptions: { itemCode: string; description: string }[] = [
  // 행사
  { itemCode: '101', description: '야외 행사 시 햇빛·비를 막아주는 대형 천막입니다. 모래주머니, 테이블, 의자와 함께 대여하면 야외 부스 세팅이 가능합니다.' },
  { itemCode: '102', description: '천막이 바람에 날리지 않도록 고정하는 데 사용합니다. 천막 대여 시 함께 빌리는 것을 권장합니다.' },
  { itemCode: '103', description: '야외 행사용 접이식 테이블입니다.' },
  { itemCode: '104', description: '일반 테이블보다 내구성이 강한 플라스틱 접이식 테이블입니다.' },
  { itemCode: '105', description: '야외 행사용 접이식 의자입니다.' },
  { itemCode: '106', description: '야간 행사 시 넓은 범위를 밝혀주는 고출력 조명입니다. 리드선과 함께 대여하면 전원 연결이 편리합니다.' },
  { itemCode: '107', description: '소형 휴대용 랜턴입니다. 한강, 그린호프 등 야외 소풍 시 활용하세요!' },
  { itemCode: '108', description: '천막 내부에 걸어 사용하는 LED 조명입니다. 리드선과 함께 대여하면 좋습니다.' },
  { itemCode: '109', description: '야외 행사 시 모기 등 해충을 퇴치하는 전기 살충기입니다. 리드선과 함께 대여하면 좋습니다.' },
  { itemCode: '110', description: '야외 공간에 깔아 사용하는 돗자리입니다. 천막, 의자와 함께 활용할 수 있습니다.' },
  { itemCode: '111', description: '행사 장소나 방향을 표시하는 데 사용하는 안내판입니다. 이젤과 함께 대여하면 세워서 사용할 수 있습니다.' },
  // 음향기기
  { itemCode: '201', description: '앰프와 케이블로 연결하여 사용하는 유선 마이크입니다. 앰프, Aux선과 함께 대여하면 좋습니다.' },
  { itemCode: '202', description: '송수신기 없이 단독으로 사용 가능한 무선 마이크입니다. 무선앰프와 함께 대여하면 좋습니다.' },
  { itemCode: '203', description: '별도 송수신기가 필요한 무선 마이크입니다. 반드시 송수신기와 함께 대여해야 합니다.' },
  { itemCode: '204', description: '무선마이크(송수신기) 전용 수신 장치입니다. 무선마이크(송수신기)와 반드시 함께 대여하세요.' },
  { itemCode: '205', description: '마이크를 고정하여 세워두는 스탠드입니다. 유선마이크와 함께 대여하면 좋습니다.' },
  { itemCode: '206', description: '야외 대규모 행사에 적합한 대출력 무선 앰프입니다. 마이크와 함께 대여하면 좋습니다.' },
  { itemCode: '207', description: '실내 소규모 행사에 적합한 무선 앰프입니다. 마이크와 함께 대여하면 좋습니다.' },
  { itemCode: '208', description: '방수 기능을 갖춘 야외 전용 무선 앰프입니다. 마이크와 함께 대여하면 좋습니다.' },
  { itemCode: '209', description: '손잡이가 달린 휴대용 확성기입니다. 별도 전원 없이 단독 사용 가능합니다.' },
  { itemCode: '210', description: 'USB-C 단자를 가진 기기와 앰프를 연결하는 케이블입니다. 앰프와 함께 대여하면 좋습니다.' },
  { itemCode: '211', description: '아이폰(Lightning)과 앰프를 연결하는 케이블입니다. 앰프와 함께 대여하면 좋습니다.' },
  { itemCode: '212', description: '3.5mm 단자끼리 연결하는 표준 오디오 케이블입니다. 앰프와 함께 대여하면 좋습니다.' },
  { itemCode: '213', description: '전원 없이 소리를 증폭시키는 원뿔형 확성기입니다. 소규모 안내 및 응원 행사에 활용할 수 있습니다.' },
  // 체육
  { itemCode: '301', description: '피구 경기용 고무공입니다. 에어펌프와 함께 대여하면 좋습니다.' },
  { itemCode: '302', description: '표준 규격 축구공입니다. 에어펌프와 함께 대여하면 좋습니다.' },
  { itemCode: '303', description: '표준 규격 농구공입니다. 에어펌프와 함께 대여하면 좋습니다.' },
  { itemCode: '304', description: '여러 명이 함께 넘는 긴 줄넘기입니다. 단체 체육 행사에 활용할 수 있습니다.' },
  { itemCode: '305', description: '단체 줄다리기 경기에 사용하는 두꺼운 밧줄입니다.' },
  { itemCode: '306', description: '전자음으로 신호를 내는 휘슬입니다. 체육 행사 진행 시 활용할 수 있습니다.' },
  { itemCode: '307', description: '족구 경기 시 코트 중앙에 설치하는 네트입니다.' },
  { itemCode: '308', description: '공에 공기를 주입하는 펌프입니다. 축구공·농구공·피구공과 함께 대여하면 좋습니다.' },
  { itemCode: '309', description: '이어달리기 경기에 사용하는 배턴입니다. 단체 체육 행사에 활용할 수 있습니다.' },
  { itemCode: '310', description: '경기 구역 표시 및 안전선 구분에 사용하는 원뿔형 콘입니다.' },
  { itemCode: '311', description: '음료·얼음 등을 차갑게 보관하는 휴대용 쿨러입니다. 야외 행사·체육 행사에 활용할 수 있습니다.' },
  // 기타
  { itemCode: '401', description: '짐을 올려 이동할 수 있는 소형 손수레입니다. 행사 물품 운반 시 활용할 수 있습니다.' },
  { itemCode: '402', description: '짐을 올려 이동할 수 있는 대형 손수레입니다. 천막, 테이블 등 무거운 행사 물품 운반에 적합합니다.' },
  { itemCode: '403', description: '전원 연장을 위한 멀티탭 연장선입니다. 조명·앰프 등 전원이 필요한 물품과 함께 대여하면 좋습니다.' },
  { itemCode: '404', description: '회의 진행 시 발언권을 표시하는 데 사용하는 봉입니다. 총회·학생회 행사에 활용할 수 있습니다.' },
  { itemCode: '405', description: '안내판·포스터 등을 세워 전시하는 거치대입니다. 안내판과 함께 대여하면 좋습니다.' },
  { itemCode: '406', description: '카메라·스마트폰을 고정하여 촬영하는 거치대입니다. 촬영 행사나 발표 녹화 시 활용할 수 있습니다.' },
  { itemCode: '407', description: '야간 행사·교통 통제 시 사용하는 발광 유도봉입니다.' },
  { itemCode: '408', description: '영상을 대형 화면으로 투사하는 프로젝터입니다. 빔스크린, Aux선과 함께 대여하면 좋습니다.' },
  { itemCode: '409', description: '프로젝터 영상을 투사하는 휴대용 스크린입니다. 빔프로젝터와 함께 대여하면 좋습니다.' },
  { itemCode: '410', description: '마커로 필기하고 지울 수 있는 이동형 화이트보드입니다. 회의·강의 진행 시 활용할 수 있습니다.' },
  { itemCode: '411', description: '숨겨진 불법 카메라를 탐지하는 장비입니다. 행사 장소 점검 시 활용할 수 있습니다.' },
  { itemCode: '412', description: '행사 사진 촬영용 배경 구조물입니다. 폴라로이드 카메라, 삼각대와 함께 대여하면 좋습니다.' },
  { itemCode: '413', description: '크로마키 합성용 녹색 배경천입니다.' },
  { itemCode: '414', description: '인물·제품 촬영 시 깔끔한 배경을 연출하는 흰색 배경천입니다.' },
  { itemCode: '415', description: '야외 행사 시 기기 충전에 사용하는 고용량 보조배터리입니다.' },
  { itemCode: '416', description: '촬영 즉시 사진이 인화되는 즉석 카메라입니다. 필름은 포함되지 않습니다.' },
  { itemCode: '417', description: '행사 참가자 이름표로 사용하는 플라스틱 명찰입니다.' },
  { itemCode: '418', description: '야외 행사 시 어두운 환경을 밝혀주는 손전등입니다. 야간 행사나 천막 내부에서 활용할 수 있습니다.' },
];

async function main() {
  console.log(`📝 물품 설명 업데이트 시작 (${descriptions.length}개)...`);
  let updated = 0;

  for (const { itemCode, description } of descriptions) {
    const result = await prisma.item.updateMany({
      where: { itemCode },
      data: { description },
    });
    if (result.count > 0) {
      updated++;
    } else {
      console.warn(`  ⚠️  itemCode ${itemCode} 해당 물품 없음`);
    }
  }

  console.log(`✅ 완료: ${updated}개 물품 설명 업데이트`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
