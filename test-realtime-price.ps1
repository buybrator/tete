# 실시간 가격 API 테스트 스크립트

Write-Host "🔄 실시간 가격 API 테스트 시작..." -ForegroundColor Yellow

# SOL 토큰 주소
$SOL_ADDRESS = "So11111111111111111111111111111111111111112"

try {
    # 실시간 가격 API 호출
    $uri = "http://localhost:3001/api/price-realtime?token=$SOL_ADDRESS"
    Write-Host "📡 API 호출: $uri" -ForegroundColor Cyan
    
    $response = Invoke-RestMethod -Uri $uri -Method GET
    
    if ($response.success) {
        Write-Host "✅ 실시간 가격 조회 성공!" -ForegroundColor Green
        Write-Host "토큰 주소: $($response.data.tokenAddress)" -ForegroundColor White
        Write-Host "현재 가격: `$$($response.data.currentPrice)" -ForegroundColor Yellow
        Write-Host "변화율: $($response.data.priceChange.ToString('F2'))%" -ForegroundColor $(if ($response.data.priceChange -ge 0) { 'Green' } else { 'Red' })
        Write-Host "업데이트 시간: $($response.data.lastUpdated)" -ForegroundColor Gray
    } else {
        Write-Host "❌ API 실패: $($response.error)" -ForegroundColor Red
    }
    
} catch {
    Write-Host "💥 오류 발생: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🏁 테스트 완료" -ForegroundColor Blue 