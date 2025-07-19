# 개선된 배치 UPSERT 테스트 스크립트 (Supabase 내장 기능 사용)

Write-Host "🚀 개선된 배치 UPSERT 테스트 시작 (Supabase 내장 기능)" -ForegroundColor Green

# 테스트 설정
$apiUrl = "http://localhost:3000/api/cron/price-collector"
$testRuns = 3

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
        
        $batchStatus = if ($response.batchProcessed) { "✅ 배치" } else { "🔄 개별" }
        Write-Host "    $batchStatus 성공: $($duration)ms | 토큰: $($response.stats.overall.total)" -ForegroundColor Green
        
        if ($response.batchProcessed) {
            Write-Host "      🎉 Supabase 내장 배치 처리 성공!" -ForegroundColor Magenta
        } else {
            Write-Host "      ⚠️  배치 실패, 개별 처리로 폴백" -ForegroundColor Yellow
        }
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
    Start-Sleep -Seconds 3
}

Write-Host "`n📈 개선된 배치 처리 결과:" -ForegroundColor Green

# 결과 분석
$successfulRuns = $results | Where-Object { $_.Success -eq $true }
$batchRuns = $successfulRuns | Where-Object { $_.BatchProcessed -eq $true }
$individualRuns = $successfulRuns | Where-Object { $_.BatchProcessed -eq $false }

Write-Host "`n🔍 전체 통계:" -ForegroundColor Yellow
Write-Host "  총 테스트: $testRuns"
Write-Host "  성공: $($successfulRuns.Count)"
Write-Host "  실패: $($testRuns - $successfulRuns.Count)"
Write-Host "  Supabase 배치 성공: $($batchRuns.Count)" -ForegroundColor Green
Write-Host "  개별 처리 폴백: $($individualRuns.Count)" -ForegroundColor Blue

if ($batchRuns.Count -gt 0) {
    $batchAvg = ($batchRuns | Measure-Object -Property Duration -Average).Average
    $batchTokenAvg = ($batchRuns | Measure-Object -Property TotalTokens -Average).Average
    
    Write-Host "`n🚀 Supabase 배치 처리 성능:" -ForegroundColor Green
    Write-Host "  성공률: $($batchRuns.Count)/$testRuns ($([math]::Round(($batchRuns.Count / $testRuns) * 100, 1))%)"
    Write-Host "  평균 실행 시간: $([math]::Round($batchAvg, 2))ms"
    Write-Host "  평균 토큰 수: $([math]::Round($batchTokenAvg, 0))"
    Write-Host "  토큰당 평균 시간: $([math]::Round($batchAvg / $batchTokenAvg, 2))ms/token" -ForegroundColor Magenta
}

if ($individualRuns.Count -gt 0) {
    $individualAvg = ($individualRuns | Measure-Object -Property Duration -Average).Average
    $individualTokenAvg = ($individualRuns | Measure-Object -Property TotalTokens -Average).Average
    
    Write-Host "`n🔄 개별 처리 성능 (폴백):" -ForegroundColor Blue
    Write-Host "  폴백율: $($individualRuns.Count)/$testRuns ($([math]::Round(($individualRuns.Count / $testRuns) * 100, 1))%)"
    Write-Host "  평균 실행 시간: $([math]::Round($individualAvg, 2))ms"
    Write-Host "  평균 토큰 수: $([math]::Round($individualTokenAvg, 0))"
    Write-Host "  토큰당 평균 시간: $([math]::Round($individualAvg / $individualTokenAvg, 2))ms/token"
}

if ($batchRuns.Count -gt 0 -and $individualRuns.Count -gt 0) {
    $improvement = (($individualAvg - $batchAvg) / $individualAvg) * 100
    Write-Host "`n📊 성능 개선도:" -ForegroundColor Magenta
    Write-Host "  Supabase 배치가 개별 처리보다 $([math]::Round($improvement, 1))% 빠름"
}

Write-Host "`n📋 상세 결과:" -ForegroundColor Yellow
$results | Format-Table -Property Run, Success, BatchProcessed, Duration, TotalTokens, SuccessfulTokens -AutoSize

Write-Host "`n🎯 개선 사항:" -ForegroundColor Cyan
Write-Host "  ✅ Raw SQL 실행 제거 (보안 향상)"
Write-Host "  ✅ Supabase 내장 .upsert() 사용 (안정성 향상)"
Write-Host "  ✅ 타입 안전성 보장"
Write-Host "  ✅ 스마트 폴백 시스템 유지"

Write-Host "`n✅ 개선된 배치 처리 테스트 완료!" -ForegroundColor Green