# RentalWeb API 테스트 가이드 (Windows PowerShell 전용)

이 문서는 윈도우 환경에서 발생하는 따옴표 문제를 해결하기 위해, PowerShell 전용 명령어(`Invoke-RestMethod`)를 사용하는 방법을 안내합니다.

## 1. 서버 실행

테스트 전 반드시 서버가 구동 중이어야 합니다.

```powershell
cd Project/server
npm run start:dev
```
- 기본 주소: `http://localhost:3000/api`

---

## 2. 인증 (Auth) API 테스트

아래 명령어를 복사하여 터미널에 붙여넣으세요. (한글 입력도 문제없습니다.)

### 2.1 회원가입 (Register)

```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/auth/register" -ContentType "application/json" -Body '{"username":"tester01","password":"password123!","name":"홍길동","student_id":"20240001","phone_number":"010-1111-2222","department":"소프트웨어학과"}'
```

### 2.2 로그인 (Login)

```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/auth/login" -ContentType "application/json" -Body '{"username":"tester01","password":"password123!"}'
```

> **성공 시:** 화면에 `accessToken`, `refreshToken` 등이 포함된 결과가 출력됩니다.

---

## 3. 인증이 필요한 API 테스트 방법

로그인 성공 시 반환되는 `accessToken` 값을 복사하여 아래 `[TOKEN]` 자리에 붙여넣으세요.

### 예시: 내 정보 조회 (Get My Profile)

```powershell
$token = "[여기에_토큰_붙여넣기]"
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/users/me" -Headers @{ Authorization = "Bearer $token" }
```

---

## 4. 문제 해결 (Troubleshooting)

- **에러 발생 시:** 이미 가입된 아이디(`409 Conflict`)일 수 있습니다. `username`이나 `student_id`를 바꿔서 다시 시도해 보세요.
- **붙여넣기:** 터미널에서 **마우스 오른쪽 버튼**을 클릭하면 복사한 내용이 붙여넣기 됩니다.
