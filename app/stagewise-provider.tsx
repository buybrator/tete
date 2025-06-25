'use client';

import { ReactNode } from 'react';

interface StagewiseProviderProps {
  children: ReactNode;
}

export function StagewiseProvider({ children }: StagewiseProviderProps) {
  // 개발 환경에서만 Stagewise 툴바를 로드
  const isDevelopment = process.env.NODE_ENV === 'development';

  // 프로덕션 환경에서는 툴바 없이 children만 반환
  if (!isDevelopment) {
    return <>{children}</>;
  }

  // 개발 환경에서는 동적 import로 안전하게 로드
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { StagewiseToolbar } = require('@stagewise/toolbar-next');

    return (
      <>
        {children}
        <StagewiseToolbar />
      </>
    );
  } catch (error) {
    // @stagewise 패키지 로드 실패 시 에러를 무시하고 children만 반환
    console.warn('⚠️ Stagewise 툴바 로드 실패 (무시됨):', error);
    return <>{children}</>;
  }
} 