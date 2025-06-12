import { NextRequest, NextResponse } from 'next/server';

// 백그라운드 가격 수집 상태 관리
let isCollectorRunning = false;
let collectorInterval: NodeJS.Timeout | null = null;
const collectionStats = {
  lastCollection: null as Date | null,
  successCount: 0,
  errorCount: 0,
  isActive: false
};

// 15분마다 자동 수집 함수
async function collectPrices() {
  try {
    console.log('🔄 백그라운드: 자동 가격 수집 시작');
    
    const response = await fetch('http://localhost:3001/api/cron/price-collector', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const result = await response.json();
      collectionStats.lastCollection = new Date();
      collectionStats.successCount++;
      console.log('✅ 백그라운드: 가격 수집 성공', result.stats);
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    collectionStats.errorCount++;
    console.error('❌ 백그라운드: 가격 수집 실패', error);
  }
}

// 다음 15분 정각까지 남은 시간 계산
function getTimeUntilNextQuarterHour(): number {
  const now = new Date();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  const milliseconds = now.getMilliseconds();
  
  const minutesToNext = 15 - (minutes % 15);
  const millisecondsToNext = (minutesToNext * 60 - seconds) * 1000 - milliseconds;
  
  return millisecondsToNext;
}

// 백그라운드 수집기 시작
function startBackgroundCollector() {
  if (isCollectorRunning) {
    console.log('⚠️ 백그라운드 수집기가 이미 실행 중입니다.');
    return;
  }

  isCollectorRunning = true;
  collectionStats.isActive = true;
  
  console.log('🚀 백그라운드 가격 수집기 시작');
  
  // 즉시 한 번 수집
  collectPrices();
  
  // 다음 15분 정각까지 대기 후 시작
  const initialDelay = getTimeUntilNextQuarterHour();
  console.log(`⏰ 다음 수집까지 ${Math.round(initialDelay / 1000)}초 대기`);
  
  setTimeout(() => {
    // 첫 15분 정각 수집
    collectPrices();
    
    // 이후 15분마다 반복
    collectorInterval = setInterval(collectPrices, 15 * 60 * 1000);
    console.log('⚡ 15분 간격 자동 수집 활성화');
  }, initialDelay);
}

// 백그라운드 수집기 중지
function stopBackgroundCollector() {
  if (collectorInterval) {
    clearInterval(collectorInterval);
    collectorInterval = null;
  }
  
  isCollectorRunning = false;
  collectionStats.isActive = false;
  console.log('🛑 백그라운드 가격 수집기 중지');
}

// API 엔드포인트들
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  switch (action) {
    case 'start':
      startBackgroundCollector();
      return NextResponse.json({
        success: true,
        message: '백그라운드 가격 수집기가 시작되었습니다.',
        stats: collectionStats
      });

    case 'stop':
      stopBackgroundCollector();
      return NextResponse.json({
        success: true,
        message: '백그라운드 가격 수집기가 중지되었습니다.',
        stats: collectionStats
      });

    case 'status':
    default:
      return NextResponse.json({
        success: true,
        isRunning: isCollectorRunning,
        stats: {
          ...collectionStats,
          nextCollection: isCollectorRunning ? 
            new Date(Date.now() + getTimeUntilNextQuarterHour()).toISOString() : null
        }
      });
  }
}

export async function POST() {
  // 서버 시작 시 자동으로 백그라운드 수집기 시작
  if (!isCollectorRunning) {
    startBackgroundCollector();
  }
  
  return NextResponse.json({
    success: true,
    message: '백그라운드 가격 수집기가 초기화되었습니다.',
    stats: collectionStats
  });
}

// 서버 시작 시 자동 실행 (모듈 로드 시)
if (typeof window === 'undefined' && !isCollectorRunning) {
  // 서버 환경에서만 실행
  console.log('🔧 서버 시작: 백그라운드 가격 수집기 초기화');
  setTimeout(startBackgroundCollector, 5000); // 5초 후 시작 (서버 안정화 대기)
} 