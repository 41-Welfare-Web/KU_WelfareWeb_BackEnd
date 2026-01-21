# 1. 서버 시작 대기 (Start Server manually)
$baseUrl = "http://localhost:3000/api"
$adminUser = "admin"
$adminPass = "admin123!"

Write-Host "Starting Auth & Plotter Verification..." -ForegroundColor Cyan

try {
    # [Auth] 1. 로그인
    Write-Host "`n[Auth Test 1] Admin Login..." -NoNewline
    $loginBody = @{ username = $adminUser; password = $adminPass } | ConvertTo-Json
    $res = Invoke-RestMethod -Method Post -Uri "$baseUrl/auth/login" -ContentType "application/json" -Body $loginBody
    $token = $res.accessToken
    $refreshToken = $res.refreshToken
    
    if ($token) { Write-Host " PASS" -ForegroundColor Green } else { Write-Host " FAIL" -ForegroundColor Red; exit }

    # [Auth] 2. 아이디 찾기 (Mock)
    Write-Host "[Auth Test 2] Find Username..." -NoNewline
    $findBody = @{ name = "관리자"; phoneNumber = "010-0000-0000" } | ConvertTo-Json
    $findRes = Invoke-RestMethod -Method Post -Uri "$baseUrl/auth/find-username" -ContentType "application/json" -Body $findBody
    if ($findRes.message) { Write-Host " PASS" -ForegroundColor Green } else { Write-Host " FAIL" -ForegroundColor Red }

    # [Auth] 3. 비밀번호 재설정 요청 (Mock)
    Write-Host "[Auth Test 3] Password Reset Request..." -NoNewline
    $resetReqBody = @{ username = "admin"; phoneNumber = "010-0000-0000" } | ConvertTo-Json
    $resetReqRes = Invoke-RestMethod -Method Post -Uri "$baseUrl/auth/password-reset/request" -ContentType "application/json" -Body $resetReqBody
    if ($resetReqRes.message) { Write-Host " PASS" -ForegroundColor Green } else { Write-Host " FAIL" -ForegroundColor Red }

    # [Auth] 4. 토큰 갱신
    Write-Host "[Auth Test 4] Refresh Token..." -NoNewline
    $refreshBody = @{ refreshToken = $refreshToken } | ConvertTo-Json
    $refreshRes = Invoke-RestMethod -Method Post -Uri "$baseUrl/auth/refresh" -ContentType "application/json" -Body $refreshBody
    if ($refreshRes.accessToken) { Write-Host " PASS" -ForegroundColor Green } else { Write-Host " FAIL" -ForegroundColor Red }

    # [Plotter] 1. 주문 생성 (파일 업로드는 curl이 편하므로 PowerShell에서는 GET/조회 위주로 테스트하거나 생략)
    # 여기서는 Admin의 주문 목록 조회 (필터링) 테스트
    Write-Host "[Plotter Test 1] Get Orders (Admin Filter)..." -NoNewline
    $headers = @{ Authorization = "Bearer $token" }
    # 상태가 PENDING인 것만 조회
    $plotterRes = Invoke-RestMethod -Method Get -Uri "$baseUrl/plotter/orders?status=PENDING" -Headers $headers
    
    if ($plotterRes.pagination) {
         Write-Host " PASS (Count: $($plotterRes.pagination.totalItems))" -ForegroundColor Green
    } else {
         Write-Host " FAIL" -ForegroundColor Red
    }

} catch {
    Write-Host "`nCritical Error: $_" -ForegroundColor Red
    Write-Host $_.ErrorDetails.Message
}
