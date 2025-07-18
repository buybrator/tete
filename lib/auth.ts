import jwt from 'jsonwebtoken'
import { PublicKey } from '@solana/web3.js'
import nacl from 'tweetnacl'

// JWT 시크릿 키 (환경 변수에서 가져오기)
const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not configured')
}

// JWT 페이로드 타입 정의
interface JWTPayload {
  walletAddress: string
  iat: number
  exp: number
}

// JWT 토큰 생성
export function generateJWT(walletAddress: string): string {
  const payload: JWTPayload = {
    walletAddress,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24시간 만료
  }
  
  return jwt.sign(payload, JWT_SECRET)
}

// JWT 토큰 검증
export function verifyJWT(token: string): { walletAddress: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload
    return { walletAddress: decoded.walletAddress }
  } catch {
    return null
  }
}

// Solana 지갑 서명 검증
export function verifyWalletSignature(
  message: string,
  signature: string,
  publicKey: string
): boolean {
  try {
    // 메시지를 Uint8Array로 변환
    const messageBytes = new TextEncoder().encode(message)
    
    // 서명을 Uint8Array로 변환
    const signatureBytes = new Uint8Array(
      signature.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
    )
    
    // 공개키를 Uint8Array로 변환
    const publicKeyBytes = new PublicKey(publicKey).toBytes()
    
    // 서명 검증
    return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes)
  } catch {
    return false
  }
}

// 사용자 프로필 생성 또는 업데이트 (RLS 우회 버전)
export async function createOrUpdateProfile(walletAddress: string, nickname?: string) {
  try {
    // 서버 사이드에서는 일반 supabase 클라이언트 사용 (RLS 우회 시도)
    const { supabase } = await import('./supabase')
    
    // 매우 간단한 upsert 시도 (RLS가 비활성화되어 있다면 작동해야 함)
    const profileData = {
      wallet_address: walletAddress,
      nickname: nickname || `User_${walletAddress.slice(0, 8)}`,
      updated_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('profiles')
      .upsert(profileData, { 
        onConflict: 'wallet_address',
        ignoreDuplicates: false 
      })
      .select()
      .single()

    if (error) {
      throw new Error('Profile creation failed');
    }
    
    return data
  } catch (error) {
    throw new Error('Profile creation failed');
  }
}

// 인증 메시지 생성
export function generateAuthMessage(walletAddress: string): string {
  const timestamp = Date.now()
  return `TradeChat Authentication\n\nWallet: ${walletAddress}\nTimestamp: ${timestamp}\n\nSign this message to authenticate with TradeChat.`
}

// 인증 토큰으로 Supabase 세션 생성
export async function createSupabaseSession(walletAddress: string) {
  // 서버 사이드에서만 실행 가능
  if (typeof window !== 'undefined') {
    throw new Error('createSupabaseSession can only be called on the server side')
  }

  try {
    // Supabase Admin 동적 import (빌드 시 에러 방지)
    const { supabaseAdmin } = await import('./supabase')
    
    if (!supabaseAdmin) {
      throw new Error('Supabase admin client is not available')
    }

    // JWT 토큰 생성
    const token = generateJWT(walletAddress)
    
    // Supabase에서 사용자 세션 생성
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email: `${walletAddress}@tradechat.local`,
      password: token,
    })

    if (error) {
      // 사용자가 없으면 생성
      const { data: signUpData, error: signUpError } = await supabaseAdmin.auth.signUp({
        email: `${walletAddress}@tradechat.local`,
        password: token,
      })

      if (signUpError) throw signUpError
      return signUpData
    }

    return data
  } catch (error) {
    throw error
  }
} 