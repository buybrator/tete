# 저장된 가격 데이터 확인 스크립트
Write-Host "📊 저장된 가격 데이터 확인 중..." -ForegroundColor Cyan

# 기본 토큰들
$defaultTokens = @(
    "So11111111111111111111111111111111111111112",  # SOL
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"   # USDC
)

foreach ($token in $defaultTokens) {
    try {
        Write-Host "`n🔍 토큰: $token" -ForegroundColor Yellow
        
        $response = Invoke-RestMethod -Uri "http://localhost:3001/api/price-updater?token=$token" -Method GET -ContentType "application/json"
        
        if ($response.success) {
            $data = $response.data
            Write-Host "  ✅ 현재 가격: $($data.currentPrice)" -ForegroundColor Green
            Write-Host "  📈 가격 변화: $([math]::Round($data.priceChange, 2))%" -ForegroundColor $(if ($data.priceChange -gt 0) { "Green" } else { "Red" })
            Write-Host "  📚 히스토리 개수: $($data.historyCount)" -ForegroundColor White
            Write-Host "  ⏰ 마지막 업데이트: $($data.lastUpdated)" -ForegroundColor Gray
            
            if ($data.historyCount -gt 0) {
                Write-Host "  📋 최근 3개 데이터:" -ForegroundColor Cyan
                $recent = $data.rawHistory | Select-Object -Last 3
                foreach ($record in $recent) {
                    Write-Host "    - $($record.timestamp_15min): O:$($record.open_price) H:$($record.high_price) L:$($record.low_price) C:$($record.close_price)" -ForegroundColor White
                }
            }
        } else {
            Write-Host "  ❌ 조회 실패: $($response.error)" -ForegroundColor Red
        }
    } catch {
        Write-Host "  ❌ API 호출 오류: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n💡 개발 서버가 실행 중인지 확인해주세요 (npm run dev on port 3001)" -ForegroundColor Yellow 