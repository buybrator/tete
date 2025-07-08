'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { applyTheme, themes, DesignTokens } from '@/lib/design-tokens';

type ThemeName = keyof typeof themes;

interface ThemeContextType {
  currentTheme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  isDark: boolean;
  toggleDarkMode: () => void;
  customTheme: DesignTokens | null;
  setCustomTheme: (theme: DesignTokens) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: ThemeName;
  storageKey?: string;
}

export function ThemeProvider({ 
  children, 
  defaultTheme = 'light',
  storageKey = 'app-theme'
}: ThemeProviderProps) {
  const [currentTheme, setCurrentTheme] = useState<ThemeName>(defaultTheme);
  const [isDark, setIsDark] = useState(false);
  const [customTheme, setCustomTheme] = useState<DesignTokens | null>(null);

  // 로컬 스토리지에서 테마 로드
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const { theme, isDark: darkMode } = JSON.parse(stored);
        setCurrentTheme(theme);
        setIsDark(darkMode);
      }
    } catch {
    }
  }, [storageKey]);

  // 테마 변경 시 적용 및 저장
  useEffect(() => {
    const themeToApply = customTheme || themes[currentTheme];
    applyTheme(themeToApply, isDark);
    
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        theme: currentTheme,
        isDark
      }));
    } catch {
    }
  }, [currentTheme, isDark, customTheme, storageKey]);

  const setTheme = (theme: ThemeName) => {
    setCurrentTheme(theme);
    setCustomTheme(null); // 커스텀 테마 리셋
  };

  const toggleDarkMode = () => {
    setIsDark(!isDark);
  };

  const value = {
    currentTheme,
    setTheme,
    isDark,
    toggleDarkMode,
    customTheme,
    setCustomTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// 테마 선택기 컴포넌트
export function ThemeSelector() {
  const { currentTheme, setTheme, isDark, toggleDarkMode } = useTheme();

  return (
    <div className="flex items-center gap-2 p-2 neo-card">
      <select 
        value={currentTheme}
        onChange={(e) => setTheme(e.target.value as ThemeName)}
        className="neo-input"
      >
        {Object.keys(themes).map((theme) => (
          <option key={theme} value={theme}>
            {theme.charAt(0).toUpperCase() + theme.slice(1)}
          </option>
        ))}
      </select>
      
      <button
        onClick={toggleDarkMode}
        className="neo-button px-3 py-1"
      >
        {isDark ? '🌙' : '☀️'}
      </button>
    </div>
  );
}

// 실시간 테마 미리보기 컴포넌트
export function ThemePreview() {
  const { currentTheme, customTheme } = useTheme();
  const theme = customTheme || themes[currentTheme];

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-lg font-heading">테마 미리보기</h3>
      
      {/* 컬러 팔레트 */}
      <div className="grid grid-cols-4 gap-2">
        <div 
          className="w-12 h-12 border-2 border-border rounded"
          style={{ backgroundColor: theme.colors.background }}
          title="Background"
        />
        <div 
          className="w-12 h-12 border-2 border-border rounded"
          style={{ backgroundColor: theme.colors.main }}
          title="Main"
        />
        <div 
          className="w-12 h-12 border-2 border-border rounded"
          style={{ backgroundColor: theme.colors.foreground }}
          title="Foreground"
        />
        <div 
          className="w-12 h-12 border-2 border-border rounded"
          style={{ backgroundColor: theme.colors.border }}
          title="Border"
        />
      </div>
      
      {/* 컴포넌트 예시 */}
      <div className="space-y-2">
        <button className="neo-button px-4 py-2">예시 버튼</button>
        <input className="neo-input px-3 py-2" placeholder="예시 입력" />
        <div className="neo-card p-3">예시 카드</div>
      </div>
    </div>
  );
} 