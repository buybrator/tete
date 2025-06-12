import '@/app/globals.css';
import { ReactNode } from 'react';
import { Inter } from 'next/font/google';
import { StagewiseProvider } from './stagewise-provider';
import WalletProviderWrapper from '@/providers/WalletProvider';
import { TradeSettingsProvider } from '@/contexts/TradeSettingsContext';
import { Toaster } from 'sonner';
import ErrorSuppressor from '@/components/ErrorSuppressor';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Trade Chat',
  description: 'SOL DEX & Memo Chat',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" className={inter.className}>
      <body className="min-h-screen bg-[#f5f5dc] text-black antialiased">
        <ErrorSuppressor />
        <WalletProviderWrapper>
          <TradeSettingsProvider>
            <StagewiseProvider>{children}</StagewiseProvider>
          </TradeSettingsProvider>
        </WalletProviderWrapper>
        <Toaster 
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            style: {
              background: 'white',
              border: '2px solid black',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: '600',
              boxShadow: '4px 4px 0px 0px black',
              color: 'black',
            },
          }}
        />
      </body>
    </html>
  );
}
