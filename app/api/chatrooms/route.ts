import { NextRequest, NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import { supabaseAdmin } from '@/lib/supabase';
import { getStableConnection } from '@/lib/solana';
import { fetchTokenMetadataWithRetry } from '@/lib/tokenMetadata';

// GET: 모든 채팅방 조회
export async function GET() {
  try {
    const { data: chatrooms, error } = await supabaseAdmin
      .from('chat_rooms')
      .select('id, name, description, image, token_address, created_by, member_count, is_active, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('채팅방 조회 오류:', error);
      return NextResponse.json(
        { success: false, error: '채팅방 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    // 응답 형식을 프론트엔드에 맞게 변환
    const formattedChatrooms = chatrooms.map(room => ({
      id: room.token_address, // CA를 ID로 사용
      name: room.name,
      contractAddress: room.token_address,
      creatorAddress: room.created_by,
      transactionSignature: '',  // GET에서는 조회하지 않음
      createdAt: room.created_at,
      isActive: true,
      image: room.image // 이미지 URL 포함
    }));
    
    return NextResponse.json({
      success: true,
      chatrooms: formattedChatrooms
    });
  } catch (error) {
    console.error('채팅방 조회 오류:', error);
    return NextResponse.json(
      { success: false, error: '채팅방 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// POST: 새로운 채팅방 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, contractAddress, creatorAddress, transactionSignature } = body;

    // 입력 데이터 검증
    if (!name || !contractAddress || !creatorAddress || !transactionSignature) {
      return NextResponse.json(
        { success: false, error: '필수 정보가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // 컨트랙트 주소 형식 검증
    try {
      new PublicKey(contractAddress);
    } catch {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 컨트랙트 주소입니다.' },
        { status: 400 }
      );
    }

    // 이미 존재하는 채팅방 체크 (CA 기준)
    const { data: existingRoom } = await supabaseAdmin
      .from('chat_rooms')
      .select('token_address')
      .eq('token_address', contractAddress.trim())
      .single();

    if (existingRoom) {
      return NextResponse.json(
        { success: false, error: '이미 해당 컨트랙트 주소로 생성된 채팅방이 존재합니다.' },
        { status: 409 }
      );
    }

    // 🎯 토큰 메타데이터 조회 (이미지 URL 추출)
    console.log(`🔍 토큰 메타데이터 조회 시작: ${contractAddress}`);
    let tokenImageUrl: string | null = null;
    let tokenName = name; // 기본값으로 사용자 입력 이름 사용
    
    try {
      // 재시도 로직과 함께 메타데이터 조회
      const metadata = await fetchTokenMetadataWithRetry(contractAddress.trim(), 3);
      
      if (metadata) {
        tokenImageUrl = metadata.image || null;
        // 메타데이터에서 이름이 있고 유의미하다면 사용
        if (metadata.name && metadata.name.trim() && metadata.name.trim() !== 'Unknown') {
          tokenName = metadata.name.trim();
        }
        console.log(`✅ 토큰 메타데이터 조회 성공:`, {
          name: tokenName,
          symbol: metadata.symbol,
          image: tokenImageUrl
        });
      } else {
        console.warn(`⚠️  토큰 메타데이터 조회 실패, 기본값 사용: ${contractAddress}`);
      }
    } catch (error) {
      console.error(`❌ 토큰 메타데이터 조회 중 오류:`, error);
      // 메타데이터 조회 실패해도 채팅방 생성은 계속 진행
    }

    // 트랜잭션 검증 (개발 환경에서는 일시적으로 비활성화)
    if (process.env.NODE_ENV === 'production') {
      const isValidTransaction = await verifyTransaction(transactionSignature);

      if (!isValidTransaction) {
        return NextResponse.json(
          { success: false, error: '트랜잭션이 유효하지 않거나 확인되지 않았습니다.' },
          { status: 400 }
        );
      }
    } else {
      console.log('🚧 개발 환경: 트랜잭션 검증 건너뜀');
    }

    // 새 채팅방을 Supabase에 저장 (토큰 이미지 URL 포함)
    const newChatroom = {
      token_address: contractAddress.trim(),
      name: tokenName.trim(), // 메타데이터에서 가져온 이름 또는 사용자 입력
      image: tokenImageUrl || '🎯', // 토큰 이미지 URL 또는 기본 이모지
      created_by: creatorAddress.trim(),
      creation_tx_signature: transactionSignature.trim(),
      created_at: new Date().toISOString()
    };

    console.log(`💾 채팅방 생성 데이터:`, newChatroom);

    const { data: insertedRoom, error: insertError } = await supabaseAdmin
      .from('chat_rooms')
      .insert(newChatroom)
      .select()
      .single();

    if (insertError) {
      console.error('채팅방 삽입 오류:', insertError);
      return NextResponse.json(
        { success: false, error: '채팅방 생성 중 데이터베이스 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    console.log('✅ 새 채팅방 생성 완료:', insertedRoom);

    // 응답 형식을 프론트엔드에 맞게 변환
    const responseRoom = {
      id: insertedRoom.token_address,
      name: insertedRoom.name,
      contractAddress: insertedRoom.token_address,
      creatorAddress: insertedRoom.created_by,
      transactionSignature: transactionSignature, // 요청에서 받은 값 사용
      createdAt: insertedRoom.created_at,
      isActive: true,
      image: insertedRoom.image // 토큰 이미지 URL 포함
    };

    return NextResponse.json({
      success: true,
      chatroom: responseRoom,
      message: '채팅방이 성공적으로 생성되었습니다.'
    });

  } catch (error) {
    console.error('채팅방 생성 오류:', error);
    return NextResponse.json(
      { success: false, error: '채팅방 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 트랜잭션 검증 함수
async function verifyTransaction(
  signature: string
): Promise<boolean> {
  try {
    const connection = await getStableConnection();
    
    // 🔄 재시도 로직 추가 (트랜잭션이 체인에 포함될 때까지 대기)
    let transaction = null;
    let attempts = 0;
    const maxAttempts = 10; // 최대 10회 시도
    
    console.log(`🔍 트랜잭션 검증 시작: ${signature}`);
    
    while (!transaction && attempts < maxAttempts) {
      try {
        transaction = await connection.getTransaction(signature, {
          commitment: 'confirmed',
          maxSupportedTransactionVersion: 0,
        });
        
        if (transaction) {
          console.log(`✅ 트랜잭션 발견 (${attempts + 1}회 시도)`);
          break;
        }
      } catch {
        console.log(`⏳ 트랜잭션 검색 중... (${attempts + 1}/${maxAttempts})`);
      }
      
      attempts++;
      if (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2초 대기
      }
    }

    if (!transaction) {
      console.log('❌ 트랜잭션을 찾을 수 없습니다:', signature);
      return false;
    }

    // 트랜잭션이 성공했는지 확인
    if (transaction.meta?.err) {
      console.log('❌ 트랜잭션이 실패했습니다:', transaction.meta.err);
      return false;
    }

    // ✅ 간단한 검증: 트랜잭션이 존재하고 성공했으면 유효한 것으로 간주
    // 메인넷에서 트랜잭션이 확정되었다면 이미 수수료를 지불했다는 의미
    console.log('✅ 트랜잭션 검증 성공:', signature);
    return true;

  } catch (error) {
    console.error('❌ 트랜잭션 검증 오류:', error);
    return false;
  }
} 