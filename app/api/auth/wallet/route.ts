import { NextRequest, NextResponse } from 'next/server'
import { 
  generateAuthMessage, 
  verifyWalletSignature, 
  generateJWT
  // createOrUpdateProfile // 임시로 주석 처리
} from '@/lib/auth'

// POST /api/auth/wallet - 지갑 서명을 통한 인증
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { walletAddress, signature, message, nickname } = body

    // 필수 필드 검증
    if (!walletAddress || !signature || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: walletAddress, signature, message' },
        { status: 400 }
      )
    }

    // 지갑 서명 검증
    const isValidSignature = verifyWalletSignature(message, signature, walletAddress)
    
    if (!isValidSignature) {
      return NextResponse.json(
        { error: 'Invalid wallet signature' },
        { status: 401 }
      )
    }

    // 메시지 형식 검증
    if (!message.includes(walletAddress)) {
      return NextResponse.json(
        { error: 'Invalid message format' },
        { status: 401 }
      )
    }

    console.log('✅ 지갑 서명 검증 성공:', walletAddress)

    // 프로필 생성/업데이트 건너뛰고 바로 JWT 생성
    console.log('프로필 생성 건너뛰고 JWT 생성 중...')
    
    // JWT 토큰 생성
    const token = generateJWT(walletAddress)

    console.log('✅ JWT 토큰 생성 완료')

    return NextResponse.json({
      success: true,
      token,
      profile: {
        wallet_address: walletAddress,
        nickname: nickname || `User_${walletAddress.slice(0, 8)}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('=== 지갑 인증 API 에러 ===')
    console.error('에러:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/auth/wallet - 인증 메시지 생성
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const walletAddress = searchParams.get('walletAddress')

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Missing walletAddress parameter' },
        { status: 400 }
      )
    }

    const message = generateAuthMessage(walletAddress)

    return NextResponse.json({
      message,
      walletAddress
    })

  } catch (error) {
    console.error('메시지 생성 에러:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 