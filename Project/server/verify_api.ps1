# 1. 서버 시작 대기 (Start Server manually in another tab if needed, but here we assume it's running or will be started)
# For this script, we assume the server is running on localhost:3000

$baseUrl = "http://localhost:3000/api"
$adminUser = "admin"
$adminPass = "admin123!"

Write-Host "Starting API Verification..." -ForegroundColor Cyan

try {
    # 2.1 관리자 로그인 (Admin Login)
    Write-Host "`n[Test 1] Admin Login..." -NoNewline
    $loginBody = @{
        username = $adminUser
        password = $adminPass
    } | ConvertTo-Json

    $loginRes = Invoke-RestMethod -Method Post -Uri "$baseUrl/auth/login" -ContentType "application/json" -Body $loginBody
    $token = $loginRes.accessToken
    
    if ($token) {
        Write-Host " PASS" -ForegroundColor Green
        # Write-Host "Token: $token"
    } else {
        Write-Host " FAIL" -ForegroundColor Red
        exit
    }

    # 3.1 내 정보 조회 (Get My Profile)
    Write-Host "[Test 2] Get My Profile..." -NoNewline
    $headers = @{ Authorization = "Bearer $token" }
    $profileRes = Invoke-RestMethod -Method Get -Uri "$baseUrl/users/me" -Headers $headers
    
    if ($profileRes.username -eq $adminUser) {
        Write-Host " PASS (User: $($profileRes.username))" -ForegroundColor Green
    } else {
        Write-Host " FAIL" -ForegroundColor Red
    }

    # 3.2 관리자 통계 조회 (Get Admin Stats)
    Write-Host "[Test 3] Get Admin Stats..." -NoNewline
    $statsRes = Invoke-RestMethod -Method Get -Uri "$baseUrl/admin/stats" -Headers $headers
    
    if ($statsRes) {
        Write-Host " PASS" -ForegroundColor Green
    } else {
        Write-Host " FAIL" -ForegroundColor Red
    }

    # 3.3 물품 목록 조회 (Get Items)
    Write-Host "[Test 4] Get Items..." -NoNewline
    $itemsRes = Invoke-RestMethod -Method Get -Uri "$baseUrl/items"
    
    if ($itemsRes.Count -gt 0) {
        Write-Host " PASS (Count: $($itemsRes.Count))" -ForegroundColor Green
    } else {
        Write-Host " FAIL (No items found or error)" -ForegroundColor Red
    }

    # 3.4 대여 예약 (Create Rental)
    Write-Host "[Test 5] Create Rental..." -NoNewline
    # 물품 ID 1번이 존재한다고 가정 (Seed에서 생성됨)
    $itemId = $itemsRes[0].id
    $rentalBody = @{
        start_date = "2026-03-01"
        end_date = "2026-03-03"
        items = @( @{ item_id = $itemId; quantity = 1 } )
    } | ConvertTo-Json

    try {
        $rentalRes = Invoke-RestMethod -Method Post -Uri "$baseUrl/rentals" -Headers $headers -ContentType "application/json" -Body $rentalBody
        if ($rentalRes.status -eq "RESERVED") {
            Write-Host " PASS (Rental ID: $($rentalRes.id))" -ForegroundColor Green
        } else {
            Write-Host " FAIL (Status: $($rentalRes.status))" -ForegroundColor Red
        }
    } catch {
        Write-Host " FAIL (Error: $_)" -ForegroundColor Red
    }

    # 3.5 내 대여 목록 조회 (Get My Rentals)
    Write-Host "[Test 6] Get My Rentals..." -NoNewline
    $myRentalsRes = Invoke-RestMethod -Method Get -Uri "$baseUrl/rentals" -Headers $headers
    
    # Updated check for 'rentals' array and snake_case fields
    if ($myRentalsRes.rentals.Count -gt 0) {
        Write-Host " PASS (Count: $($myRentalsRes.rentals.Count))" -ForegroundColor Green
        # Verify pagination keys
        if ($myRentalsRes.pagination.pageSize) {
             Write-Host "   [Subcheck] Pagination Key 'pageSize' found." -ForegroundColor Green
        } else {
             Write-Host "   [Subcheck] Pagination Key 'pageSize' NOT found." -ForegroundColor Red
        }
    } else {
        Write-Host " FAIL" -ForegroundColor Red
    }

} catch {
    Write-Host "`nCritical Error: $_" -ForegroundColor Red
}
