// 🎯 통일된 실시간 가격 브로드캐스터
// Jupiter v6 기반 단일 데이터 소스로 통합

const BROADCAST_INTERVAL = 60 * 1000; // 1분
const SYNC_INTERVAL = 15 * 60 * 1000; // 15분 (데이터베이스 동기화)
const API_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

// 활성 토큰 목록 (통일된 관리)
const ACTIVE_TOKENS = [
  'So11111111111111111111111111111111111111112', // SOL
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
  '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs', // ETH
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', // BONK
];

// 통일된 가격 브로드캐스트
async function broadcastUnifiedPrices() {
  try {
    console.log('[통합 브로드캐스터] 실시간 가격 업데이트 시작...');
    
    const response = await fetch(`${API_URL}/api/realtime-price-broadcast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tokens: ACTIVE_TOKENS,
        syncToDatabase: false // 실시간 업데이트는 DB 동기화 안 함
      })
    });

    const result = await response.json();
    
    if (result.success) {
      console.log(`[통합 브로드캐스터] ${result.data.updatedTokens}개 토큰 업데이트 완료`);
      
      // 결과 상세 정보 출력
      result.data.results.forEach(token => {
        if (token.success) {
          console.log(`  • ${token.symbol}: $${token.price.toFixed(6)} (${token.priceChangePercent >= 0 ? '+' : ''}${token.priceChangePercent.toFixed(2)}%) [${token.source}]`);
        } else {
          console.error(`  ✗ ${token.tokenAddress}: ${token.error}`);
        }
      });
    } else {
      console.error('[통합 브로드캐스터] 업데이트 실패:', result.error);
    }
  } catch (error) {
    console.error('[통합 브로드캐스터] 오류:', error.message);
  }
}

// 데이터베이스 동기화 (15분마다)
async function syncToDatabase() {
  try {
    console.log('[DB 동기화] 데이터베이스 동기화 시작...');
    
    const response = await fetch(`${API_URL}/api/unified-price-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tokens: ACTIVE_TOKENS
      })
    });

    const result = await response.json();
    
    if (result.success) {
      console.log(`[DB 동기화] ${result.data.syncedTokens}개 토큰 동기화 완료`);
    } else {
      console.error('[DB 동기화] 동기화 실패:', result.error);
    }
  } catch (error) {
    console.error('[DB 동기화] 오류:', error.message);
  }
}

// 시작
console.log('🎯 통일된 실시간 가격 브로드캐스터 시작');
console.log(`⚡ 실시간 업데이트 주기: ${BROADCAST_INTERVAL / 1000}초`);
console.log(`💾 DB 동기화 주기: ${SYNC_INTERVAL / 1000}초`);
console.log(`🎯 관리 토큰: ${ACTIVE_TOKENS.length}개`);

// 즉시 첫 실행
broadcastUnifiedPrices();

// 주기적 실행
const broadcastTimer = setInterval(broadcastUnifiedPrices, BROADCAST_INTERVAL);
const syncTimer = setInterval(syncToDatabase, SYNC_INTERVAL);

// 15분 후 첫 DB 동기화
setTimeout(syncToDatabase, 60 * 1000); // 1분 후 첫 동기화

// 프로세스 종료 처리
process.on('SIGINT', () => {
  console.log('\n[통합 브로드캐스터] 종료 중...');
  clearInterval(broadcastTimer);
  clearInterval(syncTimer);
  console.log('[통합 브로드캐스터] 종료 완료');
  process.exit(0);
});