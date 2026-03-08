
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function testWithdrawal() {
  const username = 'test_withdraw_user';
  const password = 'Password123!';
  const hashedPassword = await bcrypt.hash(password, 10);

  console.log('1. 테스트 유저 생성 중...');
  const user = await prisma.user.upsert({
    where: { username },
    update: { deletedAt: null, username, studentId: '202499999', phoneNumber: '01099998888' },
    create: {
      username,
      password: hashedPassword,
      name: '탈퇴테스터',
      studentId: '202499999',
      phoneNumber: '01099998888',
      departmentType: '학과',
      departmentName: '테스트과'
    }
  });
  console.log('유저 생성 완료:', user.id);

  // 탈퇴 로직 모사 (UsersService.deleteMe 내용)
  console.log('2. 탈퇴 처리 실행 중...');
  const inputPassword = 'Password123!';
  const isMatch = await bcrypt.compare(inputPassword, user.password);
  
  if (!isMatch) {
    console.error('오류: 비밀번호 불일치');
    return;
  }

  const timestamp = Date.now().toString().slice(-10); // 타임스탬프 뒷 10자리
  const suffix = `_d${timestamp}`; // 총 12자 (_d + 10자리)

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      deletedAt: new Date(),
      // 20자 이내로 자르고 접미사(12자) 추가
      username: `${user.username.slice(0, 8)}${suffix}`,
      studentId: `${user.studentId.slice(0, 8)}${suffix}`,
      phoneNumber: `${user.phoneNumber.slice(0, 8)}${suffix}`,
    },
  });
  console.log('탈퇴 처리 완료. 변경된 Username:', updatedUser.username);
  console.log('Username 길이:', updatedUser.username.length);

  console.log('3. 검증 중...');
  const deletedUser = await prisma.user.findUnique({
    where: { id: user.id }
  });

  if (deletedUser.deletedAt !== null) {
    console.log('성공: deletedAt 필드가 설정되었습니다.');
  } else {
    console.error('실패: deletedAt 필드가 여전히 null입니다.');
  }

  // 원래 아이디로 조회 시도 (Service logic mimics)
  const findAttempt = await prisma.user.findFirst({
    where: { username, deletedAt: null }
  });
  
  if (!findAttempt) {
    console.log('성공: 원래 아이디로 활성 사용자를 찾을 수 없습니다.');
  } else {
    console.error('실패: 탈퇴한 아이디가 여전히 검색됩니다.');
  }

  console.log('테스트 완료.');
}

testWithdrawal()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
