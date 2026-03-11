const http = require('http');

function post(url, data, token = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(JSON.stringify(data)),
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify(data));
    req.end();
  });
}

async function runTest() {
  const baseUrl = 'http://localhost:3000/api';

  console.log('--- 1. 로그인 (admin) ---');
  const loginRes = await post(`${baseUrl}/auth/login`, {
    username: 'admin',
    password: 'admin123!',
  });

  if (loginRes.status !== 200 && loginRes.status !== 201) {
    console.error('로그인 실패! 서버 실행 여부를 확인하세요.');
    return;
  }
  const token = loginRes.data.accessToken;

  console.log('--- 2. 가격 계산 테스트 ---');
  console.log('입력: 학과 학생회 - 사학과 학생회, 회칙명시사항 인쇄');
  
  const calcRes = await post(
    `${baseUrl}/plotter/calculate-price`,
    {
      purpose: '회칙명시사항 인쇄',
      paperSize: 'A0',
      pageCount: 1,
      departmentType: '학과 학생회',
      departmentName: '사학과 학생회',
    },
    token
  );

  console.log('HTTP Status:', calcRes.status);
  console.log('결과:', JSON.stringify(calcRes.data, null, 2));

  if (calcRes.data.isFree === true && calcRes.data.price === 0) {
    console.log('\n✅ 성공: 무료 판정이 정상적으로 적용되었습니다.');
  } else {
    console.log('\n❌ 실패: 여전히 유료 판정입니다.');
  }
}

runTest().catch(console.error);
