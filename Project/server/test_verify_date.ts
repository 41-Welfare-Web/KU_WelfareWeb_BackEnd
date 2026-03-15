
import axios from 'axios';
import * as FormData from 'form-data';

async function runVerify() {
  const baseURL = 'http://localhost:3000/api';
  console.log('--- [검증 시작] ---');

  try {
    // 1. 로그인
    const loginRes = await axios.post(`${baseURL}/auth/login`, {
      username: 'tester01090665493z',
      password: '@Jgn1517'
    });
    const token = loginRes.data.accessToken;
    console.log('✅ 로그인 성공');

    // 2. 플로터 주문 생성 (2026-03-19 요청)
    const formData = new FormData();
    formData.append('purpose', '회칙 인쇄');
    formData.append('paperSize', 'A0');
    formData.append('pageCount', '1');
    formData.append('departmentType', '중앙동아리');
    formData.append('departmentName', '테스트동아리');
    formData.append('pickupDate', '2026-03-19'); // 사용자 지정 날짜
    formData.append('pdfFile', Buffer.from('%PDF-1.4\nTest Content'), 'test.pdf');

    const res = await axios.post(`${baseURL}/plotter/orders`, formData, {
      headers: {
        ...formData.getHeaders(),
        Authorization: `Bearer ${token}`
      }
    });

    console.log('\n[서버 실제 응답 JSON]');
    console.log('Request pickupDate:', '2026-03-19');
    console.log('Response pickupDate:', res.data.pickupDate);
    console.log('전체 응답 전문:', JSON.stringify(res.data, null, 2));

    if (res.data.pickupDate.startsWith('2026-03-19')) {
      console.log('\n🎉 검증 성공: 날짜가 앞당겨지지 않고 19일로 정확히 반환되었습니다.');
    } else {
      console.log('\n❌ 검증 실패: 날짜가 여전히 하루 앞당겨진 것으로 보입니다.');
    }

  } catch (error: any) {
    console.error('❌ 에러 발생:', error.response?.data || error.message);
  }
}

runVerify();
