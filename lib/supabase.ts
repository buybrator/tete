import { createClient } from '@supabase/supabase-js'

// 환경 변수 검증 및 로드
function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // 빌드 시점에는 플레이스홀더 허용
  if (!url || !key) {
    console.warn('Missing Supabase environment variables, using fallback values')
    return {
      url: url || 'https://placeholder.supabase.co',
      key: key || 'placeholder-key'
    }
  }

  return { url, key }
}

// 서버 사이드 환경 변수 로드
function getSupabaseAdminConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  // 빌드 시점에는 플레이스홀더 허용
  if (!url || !serviceKey) {
    console.warn('Missing Supabase admin environment variables, using fallback values')
    return {
      url: url || 'https://placeholder.supabase.co',
      serviceKey: serviceKey || 'placeholder-service-key'
    }
  }

  return { url, serviceKey }
}

// 런타임 환경 변수 검증 (실제 API 호출 시에만)
export function validateSupabaseConnection() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key || url === 'https://placeholder.supabase.co' || key === 'placeholder-key') {
    throw new Error('Supabase environment variables are not properly configured. Please check your .env.local file.')
  }
}

// 서버 사이드 관리자 검증
export function validateSupabaseAdminConnection() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey || url === 'https://placeholder.supabase.co' || serviceKey === 'placeholder-service-key') {
    throw new Error('Supabase admin environment variables are not properly configured. Please check your .env.local file.')
  }
}

const { url: supabaseUrl, key: supabaseAnonKey } = getSupabaseConfig()
const { url: supabaseAdminUrl, serviceKey: supabaseServiceKey } = getSupabaseAdminConfig()

// 서버 사이드 관리용 클라이언트 (RLS 우회 가능)
export const supabaseAdmin = createClient<Database>(
  supabaseAdminUrl, 
  supabaseServiceKey, // 서비스 키 사용으로 RLS 우회
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Supabase에서 생성된 실제 Database 타입 정의
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      chat_rooms: {
        Row: {
          created_at: string | null
          creation_tx_signature: string
          creator_wallet: string
          room_name: string
          token_address: string
        }
        Insert: {
          created_at?: string | null
          creation_tx_signature: string
          creator_wallet: string
          room_name: string
          token_address: string
        }
        Update: {
          created_at?: string | null
          creation_tx_signature?: string
          creator_wallet?: string
          room_name?: string
          token_address?: string
        }
        Relationships: []
      }
      message_cache: {
        Row: {
          block_time: string
          content: string
          message_type: Database["public"]["Enums"]["message_type_enum"]
          price: number | null
          processed_at: string | null
          quantity: number | null
          sender_wallet: string
          signature: string
          token_address: string
        }
        Insert: {
          block_time: string
          content: string
          message_type: Database["public"]["Enums"]["message_type_enum"]
          price?: number | null
          processed_at?: string | null
          quantity?: number | null
          sender_wallet: string
          signature: string
          token_address: string
        }
        Update: {
          block_time?: string
          content?: string
          message_type?: Database["public"]["Enums"]["message_type_enum"]
          price?: number | null
          processed_at?: string | null
          quantity?: number | null
          sender_wallet?: string
          signature?: string
          token_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_message_cache_token_address"
            columns: ["token_address"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["token_address"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          nickname: string
          updated_at: string | null
          wallet_address: string
        }
        Insert: {
          created_at?: string | null
          nickname: string
          updated_at?: string | null
          wallet_address: string
        }
        Update: {
          created_at?: string | null
          nickname?: string
          updated_at?: string | null
          wallet_address?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      message_type_enum: "BUY" | "SELL" | "CHAT"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Supabase 클라이언트 생성
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

// 편의를 위한 타입 별칭
export type Profile = Database['public']['Tables']['profiles']['Row']
export type ChatRoom = Database['public']['Tables']['chat_rooms']['Row']
export type MessageCache = Database['public']['Tables']['message_cache']['Row']
export type MessageType = Database['public']['Enums']['message_type_enum']

// 타입이 적용된 Supabase 클라이언트 (기본 export)
export default supabase 