'use client';

import { ReactNode } from 'react';
import { StagewiseToolbar } from '@stagewise/toolbar-next';

interface StagewiseProviderProps {
  children: ReactNode;
}

export function StagewiseProvider({ children }: StagewiseProviderProps) {
  return (
    <>
      {children}
      <StagewiseToolbar />
    </>
  );
} 