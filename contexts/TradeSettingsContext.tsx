'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

export type TradeMode = 'buy' | 'sell';

export interface TradeSettings {
  mode: TradeMode;
  quantity: string;
  slippage: string;
  priorityFee: string;
  maxFee: string;
}

interface TradeSettingsContextType {
  settings: TradeSettings;
  updateSettings: (updates: Partial<TradeSettings>) => void;
  resetSettings: () => void;
}

const defaultSettings: TradeSettings = {
  mode: 'buy',
  quantity: '',
  slippage: '1',
  priorityFee: '0.001',
  maxFee: '0.005',
};

const TradeSettingsContext = createContext<TradeSettingsContextType | undefined>(undefined);

export function TradeSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<TradeSettings>(defaultSettings);

  const updateSettings = (updates: Partial<TradeSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
  };

  return (
    <TradeSettingsContext.Provider value={{ settings, updateSettings, resetSettings }}>
      {children}
    </TradeSettingsContext.Provider>
  );
}

export function useTradeSettings() {
  const context = useContext(TradeSettingsContext);
  if (context === undefined) {
    throw new Error('useTradeSettings must be used within a TradeSettingsProvider');
  }
  return context;
} 