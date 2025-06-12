# 15분마다 자동 가격 수집 (단순 루프)
Write-Host "🚀 자동 가격 수집 시작 (15분 간격)" -ForegroundColor Green
Write-Host "⏹️  중지하려면 Ctrl+C를 누르세요" -ForegroundColor Yellow

$collectScript = Join-Path $PSScriptRoot "collect-prices.ps1"

while ($true) {
    try {
        $currentTime = Get-Date
        $minutes = $currentTime.Minute
        
        # 15분 정각인지 확인 (0, 15, 30, 45분)
        if ($minutes -in @(0, 15, 30, 45)) {
            Write-Host "`n⏰ 정각 시간 감지: $($currentTime.ToString('HH:mm'))" -ForegroundColor Cyan
            Write-Host "🔄 가격 수집 실행 중..." -ForegroundColor Yellow
            
            # 가격 수집 스크립트 실행
            & powershell -ExecutionPolicy Bypass -File $collectScript
            
            Write-Host "✅ 수집 완료, 다음 15분까지 대기..." -ForegroundColor Green
            
            # 다음 15분 정각까지 대기 (최소 1분은 기다림)
            Start-Sleep -Seconds 60
        } else {
            # 다음 15분 정각까지 남은 시간 계산
            $nextQuarterHour = [Math]::Ceiling($minutes / 15) * 15
            if ($nextQuarterHour -eq 60) {
                $nextQuarterHour = 0
                $nextTime = $currentTime.AddHours(1).Date.AddHours($currentTime.Hour + 1)
            } else {
                $nextTime = $currentTime.Date.AddHours($currentTime.Hour).AddMinutes($nextQuarterHour)
            }
            
            $remainingMinutes = ($nextTime - $currentTime).TotalMinutes
            Write-Host "⏳ 대기 중... 다음 수집: $($nextTime.ToString('HH:mm')) (${remainingMinutes:F0}분 후)" -ForegroundColor Gray
            
            # 30초마다 체크
            Start-Sleep -Seconds 30
        }
    }
    catch {
        Write-Host "❌ 오류 발생: $_" -ForegroundColor Red
        Write-Host "⏳ 30초 후 재시도..." -ForegroundColor Yellow
        Start-Sleep -Seconds 30
    }
} 