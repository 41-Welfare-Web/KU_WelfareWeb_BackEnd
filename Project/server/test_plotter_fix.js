const axios = require('axios');

async function testPlotterFreeLogic() {
  const baseUrl = 'http://localhost:3000/api';
  
  // 1. 로그인 (테스트 계정: admin / admin123!)
  console.log('--- 로그인 시도 ---');
  let accessToken;
  try {
    const loginRes = await axios.post(`${baseUrl}/auth/login`, {
      username: 'admin',
      password: 'admin123!'
    });
    accessToken = loginRes.data.accessToken;
    console.log('로그인 성공!');
  } catch (error) {
    console.error('로그인 실패. 서버가 실행 중인지 확인하세요.');
    return;
  }

  // 2. 가격 계산 API 호출 (학과 학생회 - 회칙명시사항 인쇄)
  console.log('\n--- 플로터 가격 계산 테스트 ---');
  console.log('입력: 학과 학생회 - 사학과 학생회, 회칙명시사항 인쇄');
  
  try {
    const res = await axios.post(
      `${baseUrl}/plotter/calculate-price`,
      {
        purpose: '회칙명시사항 인쇄',
        paperSize: 'A0',
        pageCount: 1,
        departmentType: '학과 학생회',
        departmentName: '사학과 학생회'
      },
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    console.log('결과:', JSON.stringify(res.data, null, 2));
    
    if (res.data.isFree === true && res.data.price === 0) {
      console.log('\n✅ 테스트 성공: 무료로 정상 판정되었습니다.');
    } else {
      console.log('\n❌ 테스트 실패: 여전히 유료로 판정됩니다.');
    }
  } catch (error) {
    console.error('API 호출 에러:', error.response?.data || error.message);
  }
}

testPlotterFreeLogic();
