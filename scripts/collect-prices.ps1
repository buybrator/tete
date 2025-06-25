# 가격 수집 API 호출 스크립트
Write-Host "🔄 가격 데이터 수집 시작..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/cron/price-collector" -Method GET -ContentType "application/json"
    
    if ($response.success) {
        Write-Host "✅ 가격 수집 완료!" -ForegroundColor Green
        Write-Host "📊 통계:" -ForegroundColor Cyan
        Write-Host "  - 기본 토큰: $($response.stats.defaultTokens.successful)/$($response.stats.defaultTokens.total)" -ForegroundColor White
        Write-Host "  - 채팅방 토큰: $($response.stats.chatRoomTokens.successful)/$($response.stats.chatRoomTokens.total)" -ForegroundColor White
        Write-Host "  - 전체: $($response.stats.overall.successful)/$($response.stats.overall.total)" -ForegroundColor White
        Write-Host "  - 소요 시간: $($response.stats.overall.duration)" -ForegroundColor White
        Write-Host "⏰ 타임스탬프: $($response.timestamp)" -ForegroundColor Gray
    } else {
        Write-Host "❌ 가격 수집 실패: $($response.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ API 호출 오류: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "💡 개발 서버가 실행 중인지 확인해주세요 (npm run dev)" -ForegroundColor Yellow
} 