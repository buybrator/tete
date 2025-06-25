import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  basePath: process.env.NODE_ENV === 'production' ? '' : '',
  
  // Next.js 15에서 서버 전용 패키지들을 위한 설정
  serverExternalPackages: ['pg', 'express', 'socket.io'],
  
  // Webpack 설정으로 Node.js 전용 모듈들을 클라이언트에서 제외
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // 클라이언트 번들에서 서버 전용 모듈들 제외
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        'pg-native': false,
        pg: false,
        express: false,
        'socket.io': false,
      };
      
      // 서버 전용 모듈들을 external로 처리
      config.externals = config.externals || [];
      config.externals.push('pg', 'express', 'socket.io', 'cors');
    }
    return config;
  },
  
  // CORS 문제 해결을 위한 프록시 설정
  async rewrites() {
    return [
      {
        source: '/api/solana-proxy/:path*',
        destination: process.env.NEXT_PUBLIC_RPC_URL || 'https://api.mainnet-beta.solana.com/:path*',
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