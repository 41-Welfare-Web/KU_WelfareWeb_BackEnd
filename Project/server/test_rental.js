const http = require('http');

function post(url, data, headers = {}) {
  const urlObj = new URL(url);
  const body = JSON.stringify(data);
  const options = {
    hostname: urlObj.hostname,
    port: urlObj.port,
    path: urlObj.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
      ...headers
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => responseBody += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(responseBody);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, body: responseBody });
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.write(body);
    req.end();
  });
}

async function test() {
  try {
    const login = await post('http://localhost:3000/api/auth/login', {
      username: 'admin',
      password: 'admin123!'
    });
    const token = login.data.accessToken;

    const rental = await post('http://localhost:3000/api/rentals', {
      departmentType: '학과',
      departmentName: '컴퓨터공학과',
      items: [{
        itemId: 1,
        quantity: 1,
        startDate: '2026-04-13',
        endDate: '2026-04-15'
      }]
    }, { Authorization: `Bearer ${token}` });

    console.log('Rental Response:', JSON.stringify(rental, null, 2));
  } catch (error) {
    console.error('Test failed:', error);
  }
}

test();
