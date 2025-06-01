'use client';

import { ReactNode, useEffect, useState } from 'react';
import { ToolbarConfig } from '@stagewise/toolbar-next';

interface StagewiseProviderProps {
  children: ReactNode;
}

export function StagewiseProvider({ children }: StagewiseProviderProps) {
  const [StagewiseToolbar, setStagewiseToolbar] = useState<React.ComponentType<{ config?: ToolbarConfig }> | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const loadToolbar = async () => {
        try {
          const { StagewiseToolbar: Toolbar } = await import('@stagewise/toolbar-next');
          setStagewiseToolbar(() => Toolbar);
        } catch (error) {
          console.warn('Stagewise toolbar failed to load:', error);
        }
      };
      
      loadToolbar();
    }
  }, []);

  const stagewiseConfig: ToolbarConfig = {
    plugins: []
  };

  return (
    <>
      {children}
      {process.env.NODE_ENV === 'development' && StagewiseToolbar && (
        <StagewiseToolbar config={stagewiseConfig} />
      )}
    </>
  );
} 