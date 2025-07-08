import { NextRequest, NextResponse } from 'next/server';
import { tokenPriceService, DEFAULT_TOKENS } from '@/lib/tokenPriceService';
import { chatRoomTokenCollector } from '@/lib/chatRoomTokenCollector';

// ⏰ 가격 데이터 수집 크론 작업
export async function GET(request: NextRequest) {
  try {
    // 인증 헤더 확인 (선택사항 - 보안 강화용)
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET_TOKEN;
    
    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const startTime = Date.now();
    
    // 1. 기본 토큰들의 가격 수집
    
    const defaultResults = await Promise.allSettled(
      DEFAULT_TOKENS.map(async (tokenAddress) => {
        try {
          const success = await tokenPriceService.updateTokenPrice(tokenAddress);
          return { tokenAddress, success, source: 'default' };
        } catch (error) {
          return { tokenAddress, success: false, error, source: 'default' };
        }
      })
    );

    // 2. 채팅방 토큰들의 가격 수집
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