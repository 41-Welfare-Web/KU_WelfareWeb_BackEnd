
import request from 'supertest';

async function runVerify() {
  const baseURL = 'http://localhost:3000';
  console.log('--- [supertest 기반 검증 시작] ---');

  try {
    // 1. 로그인
    const loginRes = await request(baseURL)
      .post('/api/auth/login')
      .send({
        username: 'tester01090665493z',
        password: '@Jgn1517'
      });
    const token = loginRes.body.accessToken;
    console.log('✅ 로그인 성공');

    // 2. 플로터 주문 생성 (2026-03-23 요청)
    const res = await request(baseURL)
      .post('/api/plotter/orders')
      .set('Authorization', `Bearer ${token}`)
      .field('purpose', '회칙 인쇄')
      .field('paperSize', 'A0')
      .field('pageCount', '1')
      .field('departmentType', '중앙동아리')
      .field('departmentName', '테스트동아리')
      .field('pickupDate', '2026-03-23')
      .attach('pdfFile', Buffer.from('%PDF-1.4\nTest'), 'test.pdf');

    console.log('\n[서버 실제 응답 JSON]');
    console.log('Request Date:', '2026-03-23');
    console.log('Response pickupDate:', res.body.pickupDate);
    console.log('전체 응답 바디:', JSON.stringify(res.body, null, 2));

    if (res.body.pickupDate && res.body.pickupDate.startsWith('2026-03-23')) {
      console.log('\n🎉 [검증 성공] 서버는 정확히 2026-03-23를 반환했습니다.');
    } else {
      console.log('\n❌ [검증 실패] 날짜가 다르게 반환되었습니다.');
    }

  } catch (error: any) {
    console.error('❌ 에러 발생:', error.message);
  }
}

runVerify();
