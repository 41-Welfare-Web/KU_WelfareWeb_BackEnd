# RentalWeb API 테스트 가이드

이 문서는 RentalWeb 프로젝트의 API 품질을 유지하기 위한 테스트 방법들을 안내합니다. 모든 API는 **camelCase** 관례를 따릅니다.

---

## 1. Swagger UI 테스트 (권장)

웹 브라우저를 통해 시각적으로 API를 확인하고 직접 호출해볼 수 있는 가장 편리한 방법입니다.

*   **접속 주소:** `http://localhost:3000/api-docs`
*   **주요 기능:**
    *   **Request Body 자동 생성:** 각 API의 `Example Value`를 클릭하면 테스트용 JSON 데이터가 자동으로 채워집니다.
    *   **파일 업로드 지원:** 플로터 주문 API 등에서 직접 파일을 선택하여 업로드 테스트를 할 수 있습니다.
    *   **실시간 응답 확인:** `Try it out` -> `Execute` 버튼을 통해 서버의 응답을 즉시 확인할 수 있습니다.
*   **인증(Auth) 방법:**
    1.  `인증 (Auth) -> POST /api/auth/login` API를 사용하여 로그인을 수행합니다.
    2.  응답으로 받은 `accessToken` 값을 복사합니다.
    3.  Swagger 페이지 우측 상단의 **[Authorize]** 버튼을 클릭합니다.
    4.  `Value` 입력란에 `Bearer ` 문구 없이 토큰값만 붙여넣고 [Authorize]를 누릅니다.
    5.  이제 자물쇠 아이콘이 잠긴 API들을 자유롭게 호출할 수 있습니다.

---

## 2. 서버 실행 및 환경 준비

모든 테스트는 서버가 로컬에서 구동 중인 상태를 가정합니다.

```powershell
cd Project/server; npm run start:dev
```
- **Base URL:** `http://localhost:3000/api`
- **DB:** `npx prisma studio`를 통해 실시간 데이터 확인 가능

---

## 2. 자동화된 검증 스크립트 (PowerShell)

백엔드 폴더(`Project/server`)에는 주요 시나리오를 한 번에 검증할 수 있는 PowerShell 스크립트가 포함되어 있습니다.

### 2.1 주요 API 기능 검증 (`verify_api.ps1`)
```powershell
cd Project/server; .\verify_api.ps1
```

### 2.2 인증 및 플로터 기능 검증 (`verify_auth_plotter.ps1`)
```powershell
cd Project/server; .\verify_auth_plotter.ps1
```

---

## 3. 백엔드 자체 테스트 (Jest)

```powershell
# 모든 단위 테스트 실행
cd Project/server; npm run test

# E2E(End-to-End) 테스트 실행
cd Project/server; npm run test:e2e
```

---

## 4. 수동 테스트 가이드 (PowerShell CLI)

### 4.1 인증 토큰 획득 및 저장
```powershell
$res = Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/auth/login" -ContentType "application/json" -Body '{"username":"admin","password":"admin123!"}'; $token = $res.accessToken; $refreshToken = $res.refreshToken
```

### 4.2 API 호출 예시 (Bearer 토큰 포함)
```powershell
# 내 프로필 조회
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/users/me" -Headers @{ Authorization = "Bearer $token" }

# 새 대여 생성
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/rentals" -Headers @{ Authorization = "Bearer $token" } -ContentType "application/json" -Body '{"startDate":"2026-03-01","endDate":"2026-03-03","items":[{"itemId":1,"quantity":1}]}'
```

---

## 5. 기능별 개별 테스트 스니펫 (한 줄 커맨드)

복사하여 터미널에 붙여넣기만 하면 바로 동작합니다. (사전에 `$token` 변수가 설정되어 있어야 합니다.)

### 5.1 인증 (Auth)
```powershell
# 회원가입 (Register)
Invoke-RestMethod -Method Post -Uri "$baseUrl/auth/register" -ContentType "application/json" -Body '{"username":"newuser01","password":"password123!","name":"홍길동","studentId":"20260001","phoneNumber":"010-9999-8888","department":"컴퓨터공학과"}'

# 아이디 찾기 (Find Username)
Invoke-RestMethod -Method Post -Uri "$baseUrl/auth/find-username" -ContentType "application/json" -Body '{"name":"홍길동","phoneNumber":"010-9999-8888"}'

# 토큰 갱신 (Refresh Token)
$res = Invoke-RestMethod -Method Post -Uri "$baseUrl/auth/refresh" -ContentType "application/json" -Body @{ refreshToken = $refreshToken }; $token = $res.accessToken
```

### 5.2 사용자 (Users)
```powershell
# 내 정보 수정 (Update My Profile)
Invoke-RestMethod -Method Put -Uri "$baseUrl/users/me" -Headers @{ Authorization = "Bearer $token" } -ContentType "application/json" -Body '{"department":"소프트웨어학부","phoneNumber":"010-1111-2222"}'

# 관리자: 특정 사용자 역할 변경 (Update User Role)
Invoke-RestMethod -Method Put -Uri "$baseUrl/users/{userId}/role" -Headers @{ Authorization = "Bearer $token" } -ContentType "application/json" -Body '{"role":"ADMIN"}'
```

### 5.3 물품 (Items)
```powershell
# 물품 생성 (Create Item - Admin)
Invoke-RestMethod -Method Post -Uri "$baseUrl/items" -Headers @{ Authorization = "Bearer $token" } -ContentType "application/json" -Body '{"categoryId":1,"name":"테스트용 노트북","itemCode":"LAP-999","managementType":"INDIVIDUAL"}'

# 물품 상세 조회 (Get Item Detail)
Invoke-RestMethod -Method Get -Uri "$baseUrl/items/1"
```

### 5.4 대여 (Rentals)
```powershell
# 대여 상태 변경 (Update Rental Status - Admin)
Invoke-RestMethod -Method Put -Uri "$baseUrl/rentals/{rentalId}/status" -Headers @{ Authorization = "Bearer $token" } -ContentType "application/json" -Body '{"status":"RENTED","memo":"물품 전달 완료"}'
```

### 5.5 플로터 (Plotter)
```powershell
# 플로터 주문 목록 조회 (Get Orders)
Invoke-RestMethod -Method Get -Uri "$baseUrl/plotter/orders?status=PENDING" -Headers @{ Authorization = "Bearer $token" }
```

### 5.6 관리 (Admin)
```powershell
# 휴무일 추가 (Add Holiday)
Invoke-RestMethod -Method Post -Uri "$baseUrl/admin/holidays" -Headers @{ Authorization = "Bearer $token" } -ContentType "application/json" -Body '{"holidayDate":"2026-05-05","description":"어린이날"}'

# 시스템 설정 수정 (Update Config)
Invoke-RestMethod -Method Put -Uri "$baseUrl/admin/configurations" -Headers @{ Authorization = "Bearer $token" } -ContentType "application/json" -Body '{"configKey":"loginAttemptLimit","configValue":"10"}'
```

---

## 6. 테스트 시 주의사항 (Checklist)

1.  **Naming Convention**: 모든 필드는 `camelCase`를 사용해야 합니다.
2.  **Date Format**: 날짜는 `YYYY-MM-DD` 형식을 따릅니다.
3.  **Permissions**: 관리자 API는 `ADMIN` 권한 토큰이 필수입니다.
4.  **One-Liner**: 위 커맨드들은 복사 편의를 위해 한 줄(Single-line)로 작성되었습니다.