
const requestedDate = '2026-03-19';

// 실제 서버 로직에 적용된 방식
const pickupDate = new Date(`${requestedDate.split('T')[0]}T00:00:00.000Z`);

console.log('1. 사용자가 보낸 문자열:', requestedDate);
console.log('2. 서버에서 생성된 Date 객체 (ISO):', pickupDate.toISOString());
console.log('3. 서버 타임존과 무관하게 추출된 날짜:', pickupDate.toISOString().split('T')[0]);

if (pickupDate.toISOString().startsWith('2026-03-19')) {
    console.log('\n✅ [결론] 서버가 어느 나라에 있든 무조건 2026-03-19로 처리됩니다.');
} else {
    console.log('\n❌ [결론] 날짜가 앞당겨졌습니다.');
}
