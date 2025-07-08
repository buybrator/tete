import { NextRequest, NextResponse } from 'next/server'
import { verifyJWT } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { PublicKey } from '@solana/web3.js'
import nacl from 'tweetnacl'
import bs58 from 'bs58'

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
    const { message, signature, publicKey } = await request.json()
    
    if (!message || !signature || !publicKey) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify the signature
    const messageBytes = new TextEncoder().encode(message)
    const signatureBytes = bs58.decode(signature)
    const publicKeyBytes = new PublicKey(publicKey).toBytes()
    
    const verified = nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKeyBytes
    )
    
    if (!verified) {
      return NextResponse.json(
        { success: false, error: 'Invalid signature' },
        { status: 401 }
      )
    }
    
    // Generate auth token (simple implementation - in production use JWT)
    const authToken = bs58.encode(
      Buffer.from(`${publicKey}:${Date.now()}:${Math.random()}`)
    )
    
    return NextResponse.json({
      success: true,
      authToken,
      publicKey
    })
    
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to verify signature' },
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
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('wallet_address', decoded.walletAddress)
      .single()

    if (profileError || !profile) {
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

  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 