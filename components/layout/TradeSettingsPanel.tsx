'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Edit, Check, TrendingDown, Fuel } from 'lucide-react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { useTradeSettings } from '@/contexts/TradeSettingsContext';
import TokenChart from '@/components/chart/TokenChart';
import TokenAvatar from '@/components/ui/TokenAvatar';

type Props = {
  mobile?: boolean;
};



export default function TradeSettingsPanel({ mobile = false }: Props) {
  const { settings, updateSettings } = useTradeSettings();
  
  const [isEditingPresets, setIsEditingPresets] = useState(false);
  const [buyPresets, setBuyPresets] = useState(['0.1', '1', '3', '10']);
  const [sellPresets, setSellPresets] = useState(['10', '25', '50', '100']);
  const [editingValues, setEditingValues] = useState<string[]>([]);
  
  // 고급 설정 상태
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  
  // PC 버전 프리셋 설정
  const [presetSlippage, setPresetSlippage] = useState('30');
  const [presetPriority, setPresetPriority] = useState('0.0001');

  // 현재 토큰 주소 상태 (채팅방별 토큰)
  const [currentTokenAddress, setCurrentTokenAddress] = useState<string>('So11111111111111111111111111111111111111112'); // SOL 기본값
  const [currentTokenName, setCurrentTokenName] = useState<string>('SOL');



  // 채팅방 토큰 변경 이벤트 처리
  useEffect(() => {
    const handleTokenPairChanged = (event: CustomEvent) => {
      const { contractAddress, tokenName } = event.detail;
      if (contractAddress && contractAddress !== currentTokenAddress) {
        setCurrentTokenAddress(contractAddress);
        setCurrentTokenName(tokenName || '토큰');
        console.log('트레이드 패널: 토큰 변경됨', { contractAddress, tokenName });
      }
    };

    window.addEventListener('tokenPairChanged', handleTokenPairChanged as EventListener);
    return () => window.removeEventListener('tokenPairChanged', handleTokenPairChanged as EventListener);
  }, [currentTokenAddress]);

  // PC 버전 프리셋 설정값들을 TradeSettingsContext에 동기화
  useEffect(() => {
    console.log('PC 프리셋 설정값 Context 업데이트:', {
      slippage: presetSlippage,
      priorityFee: presetPriority
    });
    
    updateSettings({
      slippage: presetSlippage,
      priorityFee: presetPriority
    });
  }, [presetSlippage, presetPriority]);

  const presets = settings.mode === 'buy' ? buyPresets : sellPresets;
  const setPresets = settings.mode === 'buy' ? setBuyPresets : setSellPresets;

  // 거래 모드 변경
  const handleModeChange = (mode: 'buy' | 'sell') => {
    updateSettings({ mode });
  };

  // 수량 변경
  const handleQuantityChange = (quantity: string) => {
    updateSettings({ quantity });
  };

  // 고급 설정 변경
  const handleSlippageChange = (slippage: string) => {
    updateSettings({ slippage });
  };

  const handlePriorityFeeChange = (priorityFee: string) => {
    updateSettings({ priorityFee });
  };

  const handleMaxFeeChange = (maxFee: string) => {
    updateSettings({ maxFee });
  };



  const PanelBody = mobile ? (
    // 모바일 버전
    <div className="flex flex-col py-3 px-4 h-full" style={{ backgroundColor: 'oklch(0.2393 0 0)', color: 'white' }}>
      <div className="flex flex-col justify-between h-full">
        {/* 편집 버튼과 BUY/SELL 토글 */}
        <div className="flex items-center justify-between w-full">
          <Button
            size="sm"
            variant="neutral"
            onClick={() => {
              if (isEditingPresets) {
                const validValues = editingValues
                  .slice(0, 4)
                  .map(val => val.trim() || '0')
                  .filter(val => val !== '0' && val !== '');
                
                while (validValues.length < 4) {
                  validValues.push((validValues.length + 1).toString());
                }
                
                setPresets(validValues.slice(0, 4));
                setEditingValues([]);
                setIsEditingPresets(false);
              } else {
                const paddedPresets = [...presets];
                while (paddedPresets.length < 4) {
                  paddedPresets.push('');
                }
                setEditingValues(paddedPresets.slice(0, 4));
                setIsEditingPresets(true);
              }
            }}
            className="h-8 px-3 font-medium text-sm text-white"
            style={{ backgroundColor: 'oklch(0.2393 0 0)', borderRadius: '0', borderColor: 'rgb(0, 0, 0)' }}
          >
            {isEditingPresets ? <Check className="h-3 w-3" /> : <Edit className="h-3 w-3" />}
            {isEditingPresets ? ' 저장' : ' 편집'}
          </Button>
          
          <div className="flex w-full ml-2 gap-1">
            <Button 
              variant={settings.mode === 'buy' ? 'default' : 'neutral'}
              className={`flex-1 h-8 font-semibold transition-all text-sm ${
                settings.mode === 'buy' 
                  ? 'text-white' 
                  : 'text-white hover:text-gray-300'
              }`}
              style={{ 
                backgroundColor: settings.mode === 'buy' ? '#22c55e' : 'oklch(0.2393 0 0)',
                borderRadius: '0',
                borderColor: 'rgb(0, 0, 0)'
              }}
              onClick={() => handleModeChange('buy')}
            >
              BUY
            </Button>
            <Button 
              variant={settings.mode === 'sell' ? 'default' : 'neutral'}
              className={`flex-1 h-8 font-semibold transition-all text-sm ${
                settings.mode === 'sell' 
                  ? 'text-white' 
                  : 'text-white hover:text-gray-300'
              }`}
              style={{ 
                backgroundColor: settings.mode === 'sell' ? '#ef4444' : 'oklch(0.2393 0 0)',
                borderRadius: '0',
                borderColor: 'rgb(0, 0, 0)'
              }}
              onClick={() => handleModeChange('sell')}
            >
              SELL
            </Button>
          </div>
        </div>

        {/* 프리셋 버튼들 */}
        <div className="w-full">
          {isEditingPresets ? (
            <div className="grid grid-cols-4 gap-2 w-full">
              {[0, 1, 2, 3].map((index) => (
                <Input
                  key={index}
                  value={editingValues[index] || ''}
                  onChange={(e) => {
                    const newValues = [...editingValues];
                    while (newValues.length <= index) {
                      newValues.push('');
                    }
                    newValues[index] = e.target.value;
                    setEditingValues(newValues);
                  }}
                  className="text-center h-8 border-2 font-medium text-sm text-white placeholder-gray-400"
                  style={{
                    backgroundColor: 'oklch(0.2393 0 0)',
                    borderColor: 'rgb(0, 0, 0)',
                    borderRadius: '0',
                    boxShadow: 'none',
                    outline: 'none'
                  }}
                  placeholder={`${index + 1}`}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2 w-full">
              {presets.map((preset) => (
                <Badge 
                  key={preset}
                  variant={settings.quantity === preset ? 'default' : 'neutral'}
                  className={`cursor-pointer px-2 py-2 text-center h-8 flex items-center justify-center w-full font-semibold border-2 transition-all text-sm text-white ${
                    settings.quantity === preset 
                      ? ''
                      : 'hover:border-gray-400'
                  }`}
                  style={{
                    backgroundColor: settings.quantity === preset 
                      ? settings.mode === 'buy' 
                        ? '#22c55e' 
                        : '#ef4444'
                      : 'oklch(0.2393 0 0)',
                    borderColor: settings.quantity === preset 
                      ? settings.mode === 'buy' 
                        ? '#22c55e' 
                        : '#ef4444'
                      : 'rgb(0, 0, 0)',
                    borderRadius: '0'
                  }}
                  onClick={() => handleQuantityChange(preset)}
                >
                  {settings.mode === 'sell' ? `${preset}%` : preset}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* 수량 입력 */}
        <div className="w-full space-y-1">
          <Input 
            placeholder={settings.mode === 'buy' ? 'Enter SOL amount' : 'Enter percentage (%)'}
            value={settings.quantity}
            onChange={(e) => handleQuantityChange(e.target.value)}
            className="w-full h-8 text-base font-medium border-2 text-white placeholder-gray-400"
            style={{
              backgroundColor: 'oklch(0.2393 0 0)',
              borderColor: 'rgb(0, 0, 0)',
              borderRadius: '0',
              boxShadow: 'none',
              outline: 'none'
            }}
          />

        </div>

        {/* 고급 설정 */}
        <Drawer open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
          <DrawerTrigger asChild>
            <div className="w-full border-2 cursor-pointer transition-colors h-8 p-2 flex items-center"
                 style={{
                   backgroundColor: 'oklch(0.2393 0 0)',
                   borderColor: 'rgb(0, 0, 0)',
                   borderRadius: '0',
                   boxShadow: 'none',
                   outline: 'none'
                 }}>
              <div className="flex items-center justify-between text-sm gap-2 w-full">
                <div className="flex items-center gap-1 flex-1 min-w-0 justify-center">
                  <TrendingDown className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  <span className="font-medium text-sm truncate">{settings.slippage}%</span>
                </div>
                <div className="flex items-center gap-1 flex-1 min-w-0 justify-center">
                  <Fuel className="h-4 w-4 text-orange-500 flex-shrink-0" />
                  <span className="font-medium text-sm truncate">{settings.priorityFee}</span>
                </div>
              </div>
            </div>
          </DrawerTrigger>
          
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>고급 설정</DrawerTitle>
            </DrawerHeader>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">슬리피지 (%)</label>
                <Input
                  value={settings.slippage}
                  onChange={(e) => handleSlippageChange(e.target.value)}
                  placeholder="1"
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">우선순위 수수료</label>
                <Input
                  value={settings.priorityFee}
                  onChange={(e) => handlePriorityFeeChange(e.target.value)}
                  placeholder="0.001"
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">최대 수수료</label>
                <Input
                  value={settings.maxFee}
                  onChange={(e) => handleMaxFeeChange(e.target.value)}
                  placeholder="0.005"
                  className="w-full"
                />
              </div>
              <Button 
                className="w-full" 
                onClick={() => setIsAdvancedOpen(false)}
              >
                설정 완료
              </Button>
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </div>
  ) : (
    // PC 버전
    <div className="flex flex-col h-full py-6 justify-between" style={{ paddingLeft: '24px', paddingRight: '24px', backgroundColor: 'oklch(0.2393 0 0)', color: 'white' }}>
      {/* 상단 거래 섹션 */}
      <div className="space-y-4">
        {/* BUY/SELL 탭 */}
        <div className="flex w-full gap-3">
          <Button 
            variant={settings.mode === 'buy' ? 'default' : 'neutral'}
                          className={`flex-1 h-10 font-semibold transition-all ${
                settings.mode === 'buy' 
                  ? 'text-white' 
                  : 'text-white hover:text-gray-300'
              }`}
              style={{ 
                backgroundColor: settings.mode === 'buy' ? '#22c55e' : 'oklch(0.2393 0 0)',
                borderRadius: '0',
                borderColor: 'rgb(0, 0, 0)'
              }}
            onClick={() => handleModeChange('buy')}
          >
            Buy
          </Button>
          <Button 
            variant={settings.mode === 'sell' ? 'default' : 'neutral'}
                          className={`flex-1 h-10 font-semibold transition-all ${
                settings.mode === 'sell' 
                  ? 'text-white' 
                  : 'text-white hover:text-gray-300'
              }`}
              style={{ 
                backgroundColor: settings.mode === 'sell' ? '#ef4444' : 'oklch(0.2393 0 0)',
                borderRadius: '0',
                borderColor: 'rgb(0, 0, 0)'
              }}
            onClick={() => handleModeChange('sell')}
          >
            Sell
          </Button>
        </div>

        {/* AMOUNT 입력 */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-white">Amount</label>
          <div className="relative">
                          <Input 
                value={settings.quantity}
                onChange={(e) => handleQuantityChange(e.target.value)}
                placeholder={settings.mode === 'buy' ? 'Enter SOL amount' : 'Enter percentage (%)'}
                className="w-full h-12 text-lg font-medium border-2 focus:ring-2 focus:ring-blue-500 pr-14 text-white placeholder-gray-400"
                style={{ backgroundColor: 'oklch(0.2393 0 0)', borderColor: 'rgb(0, 0, 0)', borderRadius: '0' }}
              />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              {settings.mode === 'buy' ? (
                <TokenAvatar 
                  key={`buy-sol-${settings.mode}`}
                  tokenAddress="So11111111111111111111111111111111111111112"
                  tokenName="SOL"
                  size="sm"
                />
              ) : (
                <TokenAvatar 
                  key={`sell-${currentTokenAddress}-${settings.mode}`}
                  tokenAddress={currentTokenAddress}
                  tokenName={currentTokenName}
                  size="sm"
                />
              )}
            </div>
          </div>

        </div>

        {/* 프리셋 버튼들 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-white">Quick Amounts</label>
            <Button
              variant="neutral"
              size="sm"
              className="h-8 w-8 p-0 text-white"
              style={{ backgroundColor: 'oklch(0.2393 0 0)', borderRadius: '0', borderColor: 'rgb(0, 0, 0)' }}
              onClick={() => {
                if (isEditingPresets) {
                  const validValues = editingValues
                    .slice(0, 4)
                    .map(val => val.trim() || '0')
                    .filter(val => val !== '0' && val !== '');
                  
                  while (validValues.length < 4) {
                    validValues.push((validValues.length + 1).toString());
                  }
                  
                  setPresets(validValues.slice(0, 4));
                  setEditingValues([]);
                  setIsEditingPresets(false);
                } else {
                  const paddedPresets = [...presets];
                  while (paddedPresets.length < 4) {
                    paddedPresets.push('');
                  }
                  setEditingValues(paddedPresets.slice(0, 4));
                  setIsEditingPresets(true);
                }
              }}
            >
              {isEditingPresets ? <Check className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
            </Button>
          </div>
          
          <div className="grid grid-cols-4 gap-2">
            {isEditingPresets ? (
              [0, 1, 2, 3].map((index) => (
                <Input
                  key={index}
                  value={editingValues[index] || ''}
                  onChange={(e) => {
                    const newValues = [...editingValues];
                    while (newValues.length <= index) {
                      newValues.push('');
                    }
                    newValues[index] = e.target.value;
                    setEditingValues(newValues);
                  }}
                  className="text-center h-8 border-2 text-white placeholder-gray-400"
                  style={{
                    backgroundColor: 'oklch(0.2393 0 0)',
                    borderColor: 'rgb(0, 0, 0)',
                    borderRadius: '0',
                    boxShadow: 'none',
                    outline: 'none'
                  }}
                  placeholder={`${index + 1}`}
                />
              ))
            ) : (
              presets.map((preset) => (
                <Button
                  key={preset}
                  variant={settings.quantity === preset ? 'default' : 'neutral'}
                  className={`h-8 font-semibold border-2 transition-all text-white ${
                    settings.quantity === preset 
                      ? ''
                      : 'hover:border-gray-400'
                  }`}
                  style={{
                    backgroundColor: settings.quantity === preset 
                      ? settings.mode === 'buy' 
                        ? '#22c55e' 
                        : '#ef4444'
                      : 'oklch(0.2393 0 0)',
                    borderColor: settings.quantity === preset 
                      ? settings.mode === 'buy' 
                        ? '#22c55e' 
                        : '#ef4444'
                      : 'rgb(0, 0, 0)',
                    borderRadius: '0'
                  }}
                  onClick={() => handleQuantityChange(preset)}
                >
                  {settings.mode === 'sell' ? `${preset}%` : preset}
                </Button>
              ))
            )}
          </div>
        </div>

        {/* 현재 설정 표시 */}
        <div className="border-2 p-2" style={{ backgroundColor: 'oklch(0.2393 0 0)', borderColor: 'rgb(0, 0, 0)', borderRadius: '0' }}>
          <div className="flex items-center justify-between text-xs gap-1">
            <div className="flex items-center gap-1 flex-1 min-w-0 justify-center">
              <TrendingDown className="h-3 w-3 text-blue-500 flex-shrink-0" />
              <span className="font-medium text-xs truncate">{presetSlippage}%</span>
            </div>
            <div className="flex items-center gap-1 flex-1 min-w-0 justify-center">
              <Fuel className="h-3 w-3 text-orange-500 flex-shrink-0" />
              <span className="font-medium text-xs truncate">{presetPriority}</span>
            </div>
          </div>
        </div>

        {/* 채팅방별 토큰 가격 차트 */}
        <div className="">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-300">
                {currentTokenName} ({currentTokenAddress ? `${currentTokenAddress.slice(0, 4)}...${currentTokenAddress.slice(-4)}` : 'N/A'})
              </span>
            </div>
          </div>
          <div className="h-20 w-full">
            <TokenChart 
              tokenAddress={currentTokenAddress}
              className="w-full h-full"
            />
          </div>
        </div>
      </div>

      {/* 하단 설정값 입력 섹션 */}
              <div className="space-y-4 pt-6 border-t border-gray-600">
        {/* 설정값 입력 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-xs font-medium text-white flex items-center gap-1">
              <TrendingDown className="h-3 w-3" />
              SLIPPAGE
            </label>
            <Input
              value={presetSlippage}
              onChange={(e) => setPresetSlippage(e.target.value)}
              className="text-center h-8 text-lg font-semibold border-2 focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
              style={{ backgroundColor: 'oklch(0.2393 0 0)', borderColor: 'rgb(0, 0, 0)', borderRadius: '0' }}
              placeholder="50"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-white flex items-center gap-1">
              <span>⛽</span>
              PRIORITY
            </label>
            <Input
              value={presetPriority}
              onChange={(e) => setPresetPriority(e.target.value)}
              className="text-center h-8 text-lg font-semibold border-2 focus:ring-2 focus:ring-orange-500 text-white placeholder-gray-400"
              style={{ backgroundColor: 'oklch(0.2393 0 0)', borderColor: 'rgb(0, 0, 0)', borderRadius: '0' }}
              placeholder="105"
            />
          </div>
        </div>
      </div>
    </div>
  );

  return mobile ? (
    <div className="mobile-trade-drawer">{PanelBody}</div>
  ) : (
    <aside className="desktop-trade-panel">{PanelBody}</aside>
  );
} 