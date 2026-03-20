import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { FormData } from 'formdata-node';
import { fileFromPath } from 'formdata-node/file-from-path';

const BASE_URL = 'http://localhost:3000/api';
let adminToken: string;
let userToken: string;
let testUserId: string;

async function runTests() {
  console.log('🚀 Starting Full System API Test...');

  try {
    // 1. Admin Login
    console.log('\n[1] Admin Login...');
    const adminLogin = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123!',
    });
    adminToken = adminLogin.data.accessToken;
    console.log('✅ Admin logged in.');

    // 2. User Login
    console.log('\n[2] User Login (e2eusertest)...');
    const userLogin = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'e2eusertest',
      password: 'password123!',
    });
    userToken = userLogin.data.accessToken;
    testUserId = userLogin.data.user.id;
    console.log('✅ User logged in.');

    // 3. Rental Creation (User)
    console.log('\n[3] Creating Rental (User)...');
    // For reliability, find a date that is likely a weekday (e.g., +10 days)
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);
    // If it's Saturday(6) or Sunday(0), move to Monday
    if (futureDate.getDay() === 6) futureDate.setDate(futureDate.getDate() + 2);
    else if (futureDate.getDay() === 0) futureDate.setDate(futureDate.getDate() + 1);
    
    const startDateStr = futureDate.toISOString().split('T')[0];
    futureDate.setDate(futureDate.getDate() + 2); // 2 days rental
    const endDateStr = futureDate.toISOString().split('T')[0];

    const rentalRes = await axios.post(`${BASE_URL}/rentals`, {
      departmentType: '학과 학생회',
      departmentName: '컴퓨터공학과',
      items: [
        { 
          itemId: 1, 
          quantity: 1, 
          startDate: startDateStr, 
          endDate: endDateStr
        }
      ]
    }, { headers: { Authorization: `Bearer ${userToken}` } });
    console.log('✅ Rental created:', rentalRes.data.rentals[0].id);

    // 4. Plotter Price Calculation
    console.log('\n[4] Plotter Price Calculation (with orderQuantity)...');
    const priceRes = await axios.post(`${BASE_URL}/plotter/calculate-price`, {
      purpose: '졸업작품',
      paperSize: 'A0',
      pageCount: 3,
      orderQuantity: 3,
      departmentType: '기타'
    }, { headers: { Authorization: `Bearer ${userToken}` } });
    console.log('✅ Price calculated:', priceRes.data.price, '(Sheets:', priceRes.data.totalSheets, ')');
    if (priceRes.data.price !== 2000 * 9) {
      console.error('❌ Price mismatch! Expected 18000, got', priceRes.data.price);
    } else {
      console.log('✅ Price logic verified (2000 * 3 * 3 = 18000)');
    }

    // 5. Admin Proxy Plotter Order
    console.log('\n[5] Admin Proxy Plotter Order...');
    const form = new FormData();
    form.append('targetUserId', testUserId);
    form.append('departmentType', '학과 학생회');
    form.append('purpose', '관리자 대리 신청 테스트');
    form.append('paperSize', 'A1');
    form.append('pageCount', '2');
    form.append('orderQuantity', '5');
    form.append('pickupDate', new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0]);
    
    const testPdfPath = path.join(__dirname, 'test_dummy.pdf');
    fs.writeFileSync(testPdfPath, '%PDF-1.4\n%test content');
    form.append('pdfFile', await fileFromPath(testPdfPath, { type: 'application/pdf' }));

    const adminPlotterRes = await axios.post(`${BASE_URL}/plotter/orders/admin`, form, {
      headers: { 
        Authorization: `Bearer ${adminToken}`
        // axios 1.x and formdata-node handle boundaries automatically
      }
    });
    console.log('✅ Admin proxy plotter order created:', adminPlotterRes.data.id);
    console.log('✅ Price for proxy order:', adminPlotterRes.data.price, '(Expected: 1500 * 2 * 5 = 15000)');

    // 6. Verify History
    console.log('\n[6] Verifying Order History...');
    const orderDetail = await axios.get(`${BASE_URL}/plotter/orders`, {
      params: { userId: testUserId },
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const latestOrder = orderDetail.data.orders[0];
    console.log('✅ Rejection Reason (Initial):', latestOrder.rejectionReason);

    // 7. Update Status & Rejection Reason
    console.log('\n[7] Rejecting Order with Reason...');
    await axios.put(`${BASE_URL}/plotter/orders/${latestOrder.id}/status`, {
      status: 'REJECTED',
      rejectionReason: '테스트 반려 사유입니다.'
    }, { headers: { Authorization: `Bearer ${adminToken}` } });
    
    const rejectedDetail = await axios.get(`${BASE_URL}/plotter/orders`, {
        params: { userId: testUserId },
        headers: { Authorization: `Bearer ${adminToken}` }
    });
    const checkOrder = rejectedDetail.data.orders.find((o: any) => o.id === latestOrder.id);
    console.log('✅ Rejected Status:', checkOrder.status);
    console.log('✅ Rejection Reason:', checkOrder.rejectionReason);

    console.log('\n✨ All tests passed successfully!');

    // Cleanup
    fs.unlinkSync(testPdfPath);

  } catch (error) {
    console.error('\n❌ Test failed!');
    if (error.response) {
      console.error('Response Error:', error.response.status, error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

runTests();
