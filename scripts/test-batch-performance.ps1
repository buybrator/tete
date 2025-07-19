# 배치 UPSERT 성능 테스트 스크립트

Write-Host "🚀 배치 UPSERT 성능 테스트 시작" -ForegroundColor Green

# 테스트 설정
$apiUrl = "http://localhost:3000/api/cron/price-collector"
$testRuns = 5

Write-Host "`n📊 테스트 실행 중..." -ForegroundColor Yellow

$results = @()

for ($i = 1; $i -le $testRuns; $i++) {
    Write-Host "  테스트 실행 $i/$testRuns" -ForegroundColor Cyan
    
    $startTime = Get-Date
    
    try {
        $response = Invoke-RestMethod -Uri $apiUrl -Method GET -TimeoutSec 30
        $endTime = Get-Date
        $duration = ($endTime - $startTime).TotalMilliseconds
        
        $results += [PSCustomObject]@{
            Run = $i
            Success = $response.success
            BatchProcessed = $response.batchProcessed
            Duration = $duration
            TotalTokens = $response.stats.overall.total
            SuccessfulTokens = $response.stats.overall.successful
            Message = $response.message
        }
        
        Write-Host "    ✅ 성공: $($duration)ms (배치: $($response.batchProcessed))" -ForegroundColor Green
    }
    catch {
        $endTime = Get-Date
        $duration = ($endTime - $startTime).TotalMilliseconds
        
        $results += [PSCustomObject]@{
            Run = $i
            Success = $false
            BatchProcessed = $false
            Duration = $duration
            TotalTokens = 0
            SuccessfulTokens = 0
            Message = "Error: $($_.Exception.Message)"
        }
        
        Write-Host "    ❌ 실패: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    # 테스트 간 간격
    Start-Sleep -Seconds 2
}

Write-Host "`n📈 성능 테스트 결과:" -ForegroundColor Green

# 결과 분석
$successfulRuns = $results | Where-Object { $_.Success -eq $true }
$batchRuns = $successfulRuns | Where-Object { $_.BatchProcessed -eq $true }
$individualRuns = $successfulRuns | Where-Object { $_.BatchProcessed -eq $false }

Write-Host "`n🔍 전체 통계:" -ForegroundColor Yellow
Write-Host "  총 테스트: $testRuns"
Write-Host "  성공: $($successfulRuns.Count)"
Write-Host "  실패: $($testRuns - $successfulRuns.Count)"
Write-Host "  배치 처리: $($batchRuns.Count)"
Write-Host "  개별 처리: $($individualRuns.Count)"

if ($successfulRuns.Count -gt 0) {
    $avgDuration = ($successfulRuns | Measure-Object -Property Duration -Average).Average
    $minDuration = ($successfulRuns | Measure-Object -Property Duration -Minimum).Minimum
    $maxDuration = ($successfulRuns | Measure-Object -Property Duration -Maximum).Maximum
    
    Write-Host "`n⏱️  실행 시간 (성공한 요청만):" -ForegroundColor Yellow
    Write-Host "  평균: $([math]::Round($avgDuration, 2))ms"
    Write-Host "  최단: $([math]::Round($minDuration, 2))ms"
    Write-Host "  최장: $([math]::Round($maxDuration, 2))ms"
}

if ($batchRuns.Count -gt 0) {
    $batchAvg = ($batchRuns | Measure-Object -Property Duration -Average).Average
    Write-Host "`n🚀 배치 처리 성능:" -ForegroundColor Green
    Write-Host "  평균 실행 시간: $([math]::Round($batchAvg, 2))ms"
    Write-Host "  평균 토큰 수: $([math]::Round(($batchRuns | Measure-Object -Property TotalTokens -Average).Average, 0))"
}

if ($individualRuns.Count -gt 0) {
    $individualAvg = ($individualRuns | Measure-Object -Property Duration -Average).Average
    Write-Host "`n🔄 개별 처리 성능:" -ForegroundColor Blue
    Write-Host "  평균 실행 시간: $([math]::Round($individualAvg, 2))ms"
    Write-Host "  평균 토큰 수: $([math]::Round(($individualRuns | Measure-Object -Property TotalTokens -Average).Average, 0))"
}

if ($batchRuns.Count -gt 0 -and $individualRuns.Count -gt 0) {
    $improvement = (($individualAvg - $batchAvg) / $individualAvg) * 100
    Write-Host "`n📊 성능 개선도:" -ForegroundColor Magenta
    Write-Host "  배치 처리가 개별 처리보다 $([math]::Round($improvement, 1))% 빠름"
}

Write-Host "`n📋 상세 결과:" -ForegroundColor Yellow
$results | Format-Table -AutoSize

Write-Host "`n✅ 성능 테스트 완료!" -ForegroundColor Green