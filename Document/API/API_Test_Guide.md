# RentalWeb API 테스트 가이드 (PowerShell 스마트 모드)

이 문서는 긴 토큰이 화면에서 잘리는(`...`) 문제를 방지하기 위해, **토큰을 변수에 자동으로 저장**하여 테스트하는 방법을 안내합니다. 복사/붙여넣기를 할 필요가 없어 훨씬 편리합니다.

## 1. 서버 실행

테스트 전 반드시 서버가 구동 중이어야 합니다.

```powershell
cd Project/server
npm run start:dev
```
- 기본 주소: `http://localhost:3000/api`

---

## 2. 인증 및 토큰 자동 저장

아래 명령어들은 로그인 결과를 `$token` 변수에 바로 저장합니다. **이 섹션을 먼저 실행해야 이후 테스트가 가능합니다.**

### 2.1 관리자 로그인 (Admin)
`seed`로 생성된 관리자 계정으로 로그인합니다.

```powershell
# 1. 로그인 요청 후 결과를 $res 변수에 저장
$res = Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/auth/login" -ContentType "application/json" -Body '{"username":"admin","password":"admin123!"}'

# 2. accessToken만 뽑아서 $token 변수에 저장
$token = $res.accessToken

# 3. 확인 (전체 토큰이 출력됩니다)
Write-Host "토큰 획득 완료: $token"
```

### 2.2 일반 사용자 로그인 (User)
직접 가입시킨 사용자로 로그인할 경우입니다.

```powershell
$res = Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/auth/login" -ContentType "application/json" -Body '{"username":"tester01","password":"password123!"}'
$token = $res.accessToken
Write-Host "토큰 획득 완료"
```

---

## 3. 기능별 테스트 (변수 사용)

위에서 저장한 `$token`을 사용하여 API를 호출합니다. 복사/붙여넣기 없이 아래 명령어를 바로 실행하세요.

### 3.1 내 정보 조회 (My Profile)
```powershell
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/users/me" -Headers @{ Authorization = "Bearer $token" }
```

### 3.2 관리자 통계 조회 (Admin Stats)
(관리자 토큰일 때만 성공)
```powershell
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/admin/stats" -Headers @{ Authorization = "Bearer $token" }
```

### 3.3 물품 목록 조회 (Items)
```powershell
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/items"
```

### 3.4 대여 예약 (Rentals)
물품 ID `1`번을 2일간 대여합니다.
```powershell
$body = @{
    start_date = "2026-03-01"
    end_date = "2026-03-03"
    items = @( @{ item_id = 1; quantity = 1 } )
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/rentals" -Headers @{ Authorization = "Bearer $token" } -ContentType "application/json" -Body $body
```

### 3.5 내 대여 목록 조회
```powershell
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/rentals" -Headers @{ Authorization = "Bearer $token" }
```

---

## 4. 문제 해결 (Troubleshooting)

- **401 Unauthorized**: `$token` 변수가 비어있거나 만료된 경우입니다. **2. 인증** 섹션의 명령어를 다시 실행해서 토큰을 갱신하세요.
- **500 Internal Server Error**: 서버 로그(npm run start 창)를 확인하여 에러 원인을 파악하세요.