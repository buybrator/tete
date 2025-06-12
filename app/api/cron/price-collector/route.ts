import { NextRequest, NextResponse } from 'next/server';
import { tokenPriceService, DEFAULT_TOKENS } from '@/lib/tokenPriceService';
import { chatRoomTokenCollector } from '@/lib/chatRoomTokenCollector';

// 15분 정각으로 시간을 정규화하는 함수
function normalizeToQuarterHour(date: Date = new Date()): Date {
  const normalized = new Date(date);
  const minutes = normalized.getMinutes();
  const quarterHour = Math.floor(minutes / 15) * 15;
  
  normalized.setMinutes(quarterHour, 0, 0); // 초와 밀리초도 0으로 설정
  return normalized;
}

// ⏰ 가격 데이터 수집 크론 작업
export async function GET(request: NextRequest) {
  try {
    const currentTime = new Date();
    const normalizedTime = normalizeToQuarterHour(currentTime);
    
    console.log('🔄 크론: 가격 데이터 수집 시작', {
      현재시간: currentTime.toISOString(),
      정규화시간: normalizedTime.toISOString()
    });
    
    // 인증 헤더 확인 (선택사항 - 보안 강화용)
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET_TOKEN;
    
    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      console.warn('❌ 크론: 인증 실패');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const startTime = Date.now();
    
    // 1. 기본 토큰들의 가격 수집
    console.log(`📊 기본 토큰 ${DEFAULT_TOKENS.length}개 가격 수집 시작`);
    
    const defaultResults = await Promise.allSettled(
      DEFAULT_TOKENS.map(async (tokenAddress) => {
        try {
          const success = await tokenPriceService.updateTokenPrice(tokenAddress);
          return { tokenAddress, success, source: 'default' };
        } catch (error) {
          console.error(`❌ 기본 토큰 ${tokenAddress} 가격 수집 실패:`, error);
          return { tokenAddress, success: false, error, source: 'default' };
        }
      })
    );

    // 2. 채팅방 토큰들의 가격 수집
    console.log(`🏠 채팅방 토큰 가격 수집 시작`);
    const chatRoomResult = await chatRoomTokenCollector.collectAllChatRoomTokenPrices();
    
    // 결과 통합
    const chatRoomResults = chatRoomResult.details.map(detail => ({
      status: 'fulfilled' as const,
      value: {
        tokenAddress: detail.tokenAddress,
        success: detail.success,
        source: 'chatroom',
        error: detail.error
      }
    }));
    
    const results = [...defaultResults, ...chatRoomResults];
    
    // 결과 분석
    const successful = results.filter(result => 
      result.status === 'fulfilled' && result.value.success
    ).length;
    
    const failed = results.filter(result => 
      result.status === 'rejected' || !result.value.success
    );
    
    const duration = Date.now() - startTime;
    
    // 소스별 통계
    const defaultSuccessful = defaultResults.filter(result => 
      result.status === 'fulfilled' && result.value.success
    ).length;
    
    const totalTokens = DEFAULT_TOKENS.length + chatRoomResult.totalTokens;
    
    console.log(`✅ 크론: 가격 수집 완료`, {
      기본토큰: `${defaultSuccessful}/${DEFAULT_TOKENS.length}`,
      채팅방토큰: `${chatRoomResult.successfulUpdates}/${chatRoomResult.totalTokens}`,
      전체: `${successful}/${totalTokens}`,
      소요시간: `${duration}ms`
    });
    
    // 실패한 토큰들 로그
    if (failed.length > 0) {
      console.warn('⚠️ 크론: 실패한 토큰들:', failed.map(f => 
        f.status === 'fulfilled' ? f.value.tokenAddress : 'unknown'
      ));
    }
    
    return NextResponse.json({
      success: true,
      message: `가격 데이터 수집 완료`,
      stats: {
        defaultTokens: {
          total: DEFAULT_TOKENS.length,
          successful: defaultSuccessful,
          failed: DEFAULT_TOKENS.length - defaultSuccessful
        },
        chatRoomTokens: {
          total: chatRoomResult.totalTokens,
          successful: chatRoomResult.successfulUpdates,
          failed: chatRoomResult.failedTokens.length
        },
        overall: {
          total: totalTokens,
          successful,
          failed: failed.length,
          duration: `${duration}ms`
        }
      },
      tokens: {
        default: DEFAULT_TOKENS,
        chatRooms: chatRoomResult.details.map(d => d.tokenAddress)
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ 크론: 가격 수집 오류:', error);
    
    return NextResponse.json({
      success: false,
      error: '가격 수집 중 오류가 발생했습니다',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// POST로도 수동 실행 가능
export async function POST(request: NextRequest) {
  return GET(request);
} 