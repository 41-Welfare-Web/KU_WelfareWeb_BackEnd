# 1. 서버 시작 대기 (Start Server manually in another tab if needed, but here we assume it's running)
$baseUrl = "http://localhost:3000/api"
$adminUser = "admin"
$adminPass = "admin123!"

# Output Encoding for PowerShell console (UTF-8)
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

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
    } else {
        Write-Host " FAIL" -ForegroundColor Red
        exit
    }

    $headers = @{ Authorization = "Bearer $token" }

    # 3.1 내 정보 조회
    Write-Host "[Test 2] Get My Profile..." -NoNewline
    $profileRes = Invoke-RestMethod -Method Get -Uri "$baseUrl/users/me" -Headers $headers
    if ($profileRes.username -eq $adminUser) {
        Write-Host " PASS (User: $($profileRes.username))" -ForegroundColor Green
    } else {
        Write-Host " FAIL" -ForegroundColor Red
    }

    # 3.2 통계 조회
    Write-Host "[Test 3] Get Admin Stats..." -NoNewline
    $statsRes = Invoke-RestMethod -Method Get -Uri "$baseUrl/admin/stats" -Headers $headers
    if ($statsRes) { Write-Host " PASS" -ForegroundColor Green } else { Write-Host " FAIL" -ForegroundColor Red }

    # 3.3 물품 목록
    Write-Host "[Test 4] Get Items..." -NoNewline
    $itemsRes = Invoke-RestMethod -Method Get -Uri "$baseUrl/items"
    if ($itemsRes.Count -gt 0) {
        Write-Host " PASS (Count: $($itemsRes.Count))" -ForegroundColor Green
    } else {
        Write-Host " FAIL" -ForegroundColor Red
        exit
    }

    # 3.4 대여 예약 (Create Rental)
    # Today: 2026-03-03. Max 2 months: 2026-05-03.
    # Use 2026-04-13 (Mon) to 2026-04-15 (Wed). Both are week days.
    Write-Host "[Test 5] Create Rental..." -NoNewline
    $itemId = $itemsRes[0].id
    $rentalBody = @{
        departmentType = "학과"
        departmentName = "컴퓨터공학과"
        items = @( @{ 
            itemId = $itemId; 
            quantity = 1; 
            startDate = "2026-04-13"; 
            endDate = "2026-04-15" 
        } )
    } | ConvertTo-Json -Compress

    try {
        # UTF-8 Encoding handled for Korean characters
        $rentalRes = Invoke-RestMethod -Method Post -Uri "$baseUrl/rentals" -Headers $headers -ContentType "application/json; charset=utf-8" -Body ([System.Text.Encoding]::UTF8.GetBytes($rentalBody))
        if ($rentalRes.rentals[0].id) {
            Write-Host " PASS (Rental ID: $($rentalRes.rentals[0].id))" -ForegroundColor Green
        } else {
            Write-Host " FAIL" -ForegroundColor Red
        }
    } catch {
        if ($_.Exception.Response) {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $errBody = $reader.ReadToEnd()
            Write-Host " FAIL (HTTP $($_.Exception.Response.StatusCode): $errBody)" -ForegroundColor Red
        } else {
            Write-Host " FAIL (Error: $_)" -ForegroundColor Red
        }
    }

    # 3.5 내 대여 목록 조회
    Write-Host "[Test 6] Get My Rentals..." -NoNewline
    $myRentalsRes = Invoke-RestMethod -Method Get -Uri "$baseUrl/rentals" -Headers $headers
    if ($myRentalsRes.rentals.Count -gt 0) {
        Write-Host " PASS (Count: $($myRentalsRes.rentals.Count))" -ForegroundColor Green
    } else {
        Write-Host " FAIL" -ForegroundColor Red
    }

} catch {
    Write-Host "`nCritical Error: $_" -ForegroundColor Red
}
