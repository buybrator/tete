import { NextRequest, NextResponse } from 'next/server'
import { verifyJWT } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

// Authorization 헤더에서 토큰 추출하는 유틸리티 함수 (내부 함수로 변경)
function extractTokenFromHeader(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  
  return authHeader.substring(7) // "Bearer " 제거
}

// POST /api/auth/verify - JWT 토큰 검증
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token } = body

    if (!token) {
      return NextResponse.json(
        { error: 'Missing token' },
        { status: 400 }
      )
    }

    // JWT 토큰 검증
    const decoded = verifyJWT(token)
    
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    // 사용자 프로필 조회
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('wallet_address', decoded.walletAddress)
      .single()

    if (error || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // 성공 응답
    return NextResponse.json({
      valid: true,
      walletAddress: decoded.walletAddress,
      profile,
    })

  } catch (error) {
    console.error('Token verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/auth/verify - Authorization 헤더를 통한 토큰 검증
export async function GET(request: NextRequest) {
  try {
    const token = extractTokenFromHeader(request)

    if (!token) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 400 }
      )
    }

    // JWT 토큰 검증
    const decoded = verifyJWT(token)
    
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    // 사용자 프로필 조회
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('wallet_address', decoded.walletAddress)
      .single()

    if (error || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // 성공 응답
    return NextResponse.json({
      valid: true,
      walletAddress: decoded.walletAddress,
      profile,
    })

  } catch (error) {
    console.error('Token verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 