# 1. API Verification Script (Unicode safe)
$baseUrl = "https://rentalweb-production.up.railway.app/api"
$adminUser = "admin"
$adminPass = "admin123!"

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Write-Host "Starting API Verification on Production (Unicode Safe)..." -ForegroundColor Cyan

try {
    # 1. Admin Login
    Write-Host "`n[Test 1] Admin Login..." -NoNewline
    $loginBody = @{ username = $adminUser; password = $adminPass } | ConvertTo-Json
    $loginRes = Invoke-RestMethod -Method Post -Uri "$baseUrl/auth/login" -ContentType "application/json" -Body $loginBody
    $token = $loginRes.accessToken
    if ($token) { Write-Host " PASS" -ForegroundColor Green } else { Write-Host " FAIL"; exit }
    $headers = @{ Authorization = "Bearer $token" }

    # 2. Get Profile
    Write-Host "[Test 2] Get My Profile..." -NoNewline
    $profileRes = Invoke-RestMethod -Method Get -Uri "$baseUrl/users/me" -Headers $headers
    Write-Host " PASS (User: $($profileRes.username))" -ForegroundColor Green

    # 3. Get Items
    Write-Host "[Test 4] Get Items..." -NoNewline
    $itemsRes = Invoke-RestMethod -Method Get -Uri "$baseUrl/items"
    if ($itemsRes.Count -gt 0) { Write-Host " PASS (Count: $($itemsRes.Count))" -ForegroundColor Green } else { Write-Host " FAIL"; exit }

    # 4. Create Rental (Using departmentType: 학과 학생회)
    Write-Host "[Test 5] Create Rental (Category Check)..." -NoNewline
    $itemId = $itemsRes[0].id
    # '학과 학생회' = \uD559\uACFC\u0020\uD559\uC0DD\uD68C
    # '컴퓨터공학과' = \uCEF4\uD4E8\uD130\uACF5\uD559\uACFC
    $deptType = [System.Text.RegularExpressions.Regex]::Unescape("\uD559\uACFC\u0020\uD559\uC0DD\uD68C")
    $deptName = [System.Text.RegularExpressions.Regex]::Unescape("\uCEF4\uD4E8\uD130\uACF5\uD559\uACFC")
    
    $rentalBody = @{
        departmentType = $deptType
        departmentName = $deptName
        items = @( @{ 
            itemId = $itemId; 
            quantity = 1; 
            startDate = "2026-03-23"; 
            endDate = "2026-03-25" 
        } )
    } | ConvertTo-Json -Compress

    try {
        $rentalRes = Invoke-RestMethod -Method Post -Uri "$baseUrl/rentals" -Headers $headers -ContentType "application/json; charset=utf-8" -Body ([System.Text.Encoding]::UTF8.GetBytes($rentalBody))
        if ($rentalRes[0].id) { Write-Host " PASS (Rental ID: $($rentalRes[0].id))" -ForegroundColor Green } else { Write-Host " FAIL" -ForegroundColor Red }
    } catch {
        Write-Host " FAIL ($($_.Exception.Message))" -ForegroundColor Red
    }

    # 5. Metadata Check
    Write-Host "[Test 6] Get Metadata (Order Check)..." -NoNewline
    $metaRes = Invoke-RestMethod -Method Get -Uri "$baseUrl/common/metadata"
    # '중앙자치기구' = \uC911\uC559\uC790\uCE21\uAE30\uAD6C
    $targetCategory = [System.Text.RegularExpressions.Regex]::Unescape("\uC911\uC559\uC790\uCE21\uAE30\uAD6C")
    if ($metaRes.departments[0].category -eq $targetCategory) {
        Write-Host " PASS (First: $targetCategory)" -ForegroundColor Green
    } else {
        Write-Host " FAIL (First: $($metaRes.departments[0].category))" -ForegroundColor Red
    }

} catch {
    Write-Host "`nCritical Error: $_" -ForegroundColor Red
}
