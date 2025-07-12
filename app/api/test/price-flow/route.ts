import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// 전체 가격 수집 흐름 테스트 API
export async function GET() {
  try {
    // 1. 등록된 토큰 확인
    const { data: chatRooms, error: roomError } = await supabase
      .from('chat_rooms')
      .select('token_address, name')
      .not('token_address', 'is', null)
      .not('token_address', 'eq', '');

    if (roomError) {
      throw new Error(`채팅방 조회 실패: ${roomError.message}`);
    }

    const uniqueTokens = [...new Set(chatRooms?.map(room => room.token_address) || [])];

    // 2. 최근 가격 데이터 확인
    const priceCheckPromises = uniqueTokens.map(async (token) => {
      const { data, error } = await supabase
        .from('token_price_history')
        .select('*')
        .eq('token_address', token)
        .order('timestamp_1min', { ascending: false })
        .limit(5);

      const room = chatRooms?.find(r => r.token_address === token);
      
      return {
        token,
        roomName: room?.name || 'Unknown',
        dataCount: data?.length || 0,
        latestPrice: data?.[0]?.price || null,
        latestTimestamp: data?.[0]?.timestamp_1min || null,
        error: error?.message || null
      };
    });

    const tokenStatus = await Promise.all(priceCheckPromises);

    // 3. Edge Function 상태 확인
    const edgeFunctionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/collect-prices`;
    
    // 4. 전체 상태 요약
    const summary = {
      totalRooms: chatRooms?.length || 0,
      uniqueTokens: uniqueTokens.length,
      tokensWithData: tokenStatus.filter(t => t.dataCount > 0).length,
      tokensWithoutData: tokenStatus.filter(t => t.dataCount === 0).length,
      edgeFunctionUrl,
      cronStatus: 'Check Cron-job.org dashboard'
    };

    return NextResponse.json({
      success: true,
      summary,
      tokenDetails: tokenStatus,
      instructions: {
        step1: '채팅방 생성 시 token_address가 DB에 저장됨 ✓',
        step2: 'Edge Function이 1분마다 모든 토큰 가격 수집',
        step3: 'Cron-job.org가 Edge Function을 1분마다 호출',
        step4: '차트는 실시간으로 DB 데이터 표시'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: '흐름 테스트 중 오류 발생',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}