import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  basePath: process.env.NODE_ENV === 'production' ? '' : '',
  
  // CORS 문제 해결을 위한 프록시 설정
  async rewrites() {
    return [
      {
        source: '/api/solana-proxy/:path*',
        destination: 'https://api.mainnet-beta.solana.com/:path*',
      },
      {
        source: '/api/serum-proxy/:path*',
        destination: 'https://solana-api.projectserum.com/:path*',
      },
    ];
  },
  
  env: {
    // Helius 제거, 공식 RPC만 사용
    NEXT_PUBLIC_SOLANA_NETWORK: process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'mainnet',
    NEXT_PUBLIC_MEMO_PROGRAM_ID: process.env.NEXT_PUBLIC_MEMO_PROGRAM_ID || 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr',
    // JWT 시크릿 추가
    JWT_SECRET: process.env.JWT_SECRET || 'TradeChat-Super-Secret-Key-2024',
  },
};

export default nextConfig;