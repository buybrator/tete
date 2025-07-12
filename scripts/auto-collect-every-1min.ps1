# 1분마다 자동 가격 수집 (단순 루프)
Write-Host "🚀 자동 가격 수집 시작 (1분 간격)" -ForegroundColor Green
Write-Host "⏹️  중지하려면 Ctrl+C를 누르세요" -ForegroundColor Yellow

$collectScript = Join-Path $PSScriptRoot "collect-prices.ps1"

while ($true) {
    try {
        $currentTime = Get-Date
        $seconds = $currentTime.Second
        
        # 1분 정각인지 확인 (초가 0일 때)
        if ($seconds -eq 0) {
            Write-Host "`n⏰ 정각 시간 감지: $($currentTime.ToString('HH:mm:ss'))" -ForegroundColor Cyan
            Write-Host "🔄 가격 수집 실행 중..." -ForegroundColor Yellow
            
            # 가격 수집 스크립트 실행
            & powershell -ExecutionPolicy Bypass -File $collectScript
            
            Write-Host "✅ 수집 완료, 다음 1분까지 대기..." -ForegroundColor Green
            
            # 다음 1분 정각까지 대기 (최소 1초는 기다림)
            Start-Sleep -Seconds 1
        } else {
            # 다음 1분 정각까지 남은 시간 계산
            $remainingSeconds = 60 - $seconds
            Write-Host "⏳ 대기 중... 다음 수집까지 ${remainingSeconds}초" -ForegroundColor Gray -NoNewline
            Write-Host "`r" -NoNewline
            
            # 1초마다 체크
            Start-Sleep -Seconds 1
        }
    }
    catch {
        Write-Host "❌ 오류 발생: $_" -ForegroundColor Red
        Write-Host "⏳ 5초 후 재시도..." -ForegroundColor Yellow
        Start-Sleep -Seconds 5
    }
}