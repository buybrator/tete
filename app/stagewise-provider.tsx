'use client';

import { ReactNode, useEffect, useState } from 'react';

interface StagewiseProviderProps {
  children: ReactNode;
}

export function StagewiseProvider({ children }: StagewiseProviderProps) {
  const [StagewiseToolbar, setStagewiseToolbar] = useState<React.ComponentType | null>(null);
  
  // 개발 환경에서만 Stagewise 툴바를 로드
  const isDevelopment = process.env.NODE_ENV === 'development';

  useEffect(() => {
    if (isDevelopment) {
      // 동적 import를 사용하여 Turbopack 호환성 개선
      import('@stagewise/toolbar-next')
        .then((module) => {
          setStagewiseToolbar(() => module.StagewiseToolbar);
        })
        .catch(() => {
          // @stagewise 패키지 로드 실패 시 에러를 무시
          console.log('Stagewise toolbar not available');
        });
    }
  }, [isDevelopment]);

  // 개발 환경이 아니거나 툴바가 로드되지 않은 경우 children만 반환
  if (!isDevelopment || !StagewiseToolbar) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      <StagewiseToolbar />
    </>
  );
} 