'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Edit, Check, TrendingDown, Fuel, DollarSign } from 'lucide-react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { useTradeSettings } from '@/contexts/TradeSettingsContext';

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
  const [selectedPreset, setSelectedPreset] = useState(1);
  const [settingsMode, setSettingsMode] = useState<'buy' | 'sell'>('buy');
  const [presetSlippage, setPresetSlippage] = useState('50');
  const [presetPriority, setPresetPriority] = useState('105');
  const [presetBribe, setPresetBribe] = useState('0.001');
  
  // 차트 시간 필터 상태
  const [selectedPeriod, setSelectedPeriod] = useState('1D');
  
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

  // 차트 데이터 생성 (가격 변동 시뮬레이션)
  const generateChartData = () => {
    const data = [];
    let price = 45; // 시작 가격
    
    for (let i = 0; i < 50; i++) {
      // 랜덤한 가격 변동 (-2% ~ +2%)
      const change = (Math.random() - 0.5) * 0.04;
      price = price * (1 + change);
      
      data.push({
        index: i,
        price: price
      });
    }
    
    return data;
  };

  const chartData = generateChartData();

  const PanelBody = mobile ? (
    // 모바일 버전
    <div className="flex flex-col py-3 px-4 h-full">
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
            className="h-8 px-3 font-medium text-sm"
          >
            {isEditingPresets ? <Check className="h-3 w-3" /> : <Edit className="h-3 w-3" />}
            {isEditingPresets ? ' 저장' : ' 편집'}
          </Button>
          
          <div className="flex w-full bg-neutral-100 rounded-lg p-1 ml-2">
            <Button 
              variant={settings.mode === 'buy' ? 'default' : 'neutral'}
              className={`flex-1 h-8 rounded-md font-semibold transition-all text-sm ${
                settings.mode === 'buy' 
                  ? 'bg-green-500 hover:bg-green-600 text-white' 
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
              onClick={() => handleModeChange('buy')}
            >
              BUY
            </Button>
            <Button 
              variant={settings.mode === 'sell' ? 'default' : 'neutral'}
              className={`flex-1 h-8 rounded-md font-semibold transition-all text-sm ${
                settings.mode === 'sell' 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
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
                  className="text-center h-8 border-2 font-medium text-sm"
                  style={{
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
                  className={`cursor-pointer px-2 py-2 text-center h-8 flex items-center justify-center w-full font-semibold border-2 transition-all rounded-md text-sm ${
                    settings.quantity === preset 
                      ? settings.mode === 'buy' 
                        ? 'bg-green-500 hover:bg-green-600 text-white border-green-500' 
                        : 'bg-red-500 hover:bg-red-600 text-white border-red-500'
                      : 'hover:border-gray-400'
                  }`}
                  onClick={() => handleQuantityChange(preset)}
                >
                  {preset}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* 수량 입력 */}
        <div className="w-full">
          <Input 
            placeholder={settings.mode === 'buy' ? 'Enter SOL amount' : 'Enter percentage'}
            value={settings.quantity}
            onChange={(e) => handleQuantityChange(e.target.value)}
            className="w-full h-8 text-base font-medium border-2"
            style={{
              boxShadow: 'none',
              outline: 'none'
            }}
          />
        </div>

        {/* 고급 설정 */}
        <Drawer open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
          <DrawerTrigger asChild>
            <div className="w-full bg-gray-50 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors h-8 p-2 flex items-center"
                 style={{
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
                <div className="flex items-center gap-1 flex-1 min-w-0 justify-center">
                  <DollarSign className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="font-medium text-sm truncate">{settings.maxFee}</span>
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
    <div className="flex flex-col h-full p-6 justify-between">
      {/* 상단 거래 섹션 */}
      <div className="space-y-4">
        {/* BUY/SELL 탭 */}
        <div className="flex w-full bg-neutral-100 rounded-lg py-1 gap-3">
          <Button 
            variant={settings.mode === 'buy' ? 'default' : 'neutral'}
            className={`flex-1 h-10 rounded-md font-semibold transition-all ${
              settings.mode === 'buy' 
                ? 'bg-green-500 hover:bg-green-600 text-white shadow-md' 
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
            onClick={() => handleModeChange('buy')}
          >
            Buy
          </Button>
          <Button 
            variant={settings.mode === 'sell' ? 'default' : 'neutral'}
            className={`flex-1 h-10 rounded-md font-semibold transition-all ${
              settings.mode === 'sell' 
                ? 'bg-red-500 hover:bg-red-600 text-white shadow-md' 
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
            onClick={() => handleModeChange('sell')}
          >
            Sell
          </Button>
        </div>

        {/* AMOUNT 입력 */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Amount</label>
          <div className="flex items-center gap-2">
            <Input 
              value={settings.quantity}
              onChange={(e) => handleQuantityChange(e.target.value)}
              placeholder={settings.mode === 'buy' ? 'Enter SOL amount' : 'Enter percentage'}
              className="flex-1 h-12 text-lg font-medium border-2 focus:ring-2 focus:ring-blue-500"
            />
            <Button variant="neutral" className="h-12 w-12 p-0 border-2">
              <span className="text-lg">⚙️</span>
            </Button>
          </div>
        </div>

        {/* 프리셋 버튼들 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">Quick Amounts</label>
            <Button
              variant="neutral"
              size="sm"
              className="h-8 w-8 p-0"
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
                  className="text-center h-8 border-2"
                  style={{
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
                  className={`h-8 font-semibold border-2 transition-all ${
                    settings.quantity === preset 
                      ? settings.mode === 'buy' 
                        ? 'bg-green-500 hover:bg-green-600 text-white border-green-500' 
                        : 'bg-red-500 hover:bg-red-600 text-white border-red-500'
                      : 'hover:border-gray-400'
                  }`}
                  onClick={() => handleQuantityChange(preset)}
                >
                  {preset}
                </Button>
              ))
            )}
          </div>
        </div>

        {/* 현재 설정 표시 */}
        <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-2">
          <div className="flex items-center justify-between text-xs gap-1">
            <div className="flex items-center gap-1 flex-1 min-w-0 justify-center">
              <TrendingDown className="h-3 w-3 text-blue-500 flex-shrink-0" />
              <span className="font-medium text-xs truncate">{settings.slippage}%</span>
            </div>
            <div className="flex items-center gap-1 flex-1 min-w-0 justify-center">
              <Fuel className="h-3 w-3 text-orange-500 flex-shrink-0" />
              <span className="font-medium text-xs truncate">{settings.priorityFee}</span>
            </div>
            <div className="flex items-center gap-1 flex-1 min-w-0 justify-center">
              <DollarSign className="h-3 w-3 text-green-500 flex-shrink-0" />
              <span className="font-medium text-xs truncate">{settings.maxFee}</span>
            </div>
          </div>
        </div>

        {/* 차트 영역 */}
        <div className="bg-white border-2 border-gray-200 rounded-[15px] p-4 h-48">
          <ResponsiveContainer width="100%" height="75%">
            <LineChart data={chartData}>
              <Line 
                type="monotone" 
                dataKey="price" 
                stroke="#22c55e" 
                strokeWidth={2}
                dot={false}
                activeDot={false}
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex justify-center mt-2">
            <div className="flex gap-1 bg-gray-100 rounded-[15px] p-1">
              {['1H', '1D', '1W', '1M', 'All'].map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-3 py-1 text-xs font-medium rounded-[15px] transition-colors ${
                    selectedPeriod === period
                      ? 'bg-green-500 text-white' 
                      : 'bg-transparent text-gray-600 hover:bg-green-100 hover:text-green-600'
                  }`}
                  style={{ boxShadow: 'none' }}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 하단 프리셋 설정 섹션 */}
      <div className="space-y-4 pt-6 border-t border-gray-200">
        {/* 프리셋 탭 */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Presets</label>
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((preset) => (
              <Button
                key={preset}
                variant={selectedPreset === preset ? 'default' : 'neutral'}
                className={`h-10 font-semibold transition-all ${
                  selectedPreset === preset 
                    ? 'bg-blue-500 hover:bg-blue-600 text-white border-blue-500' 
                    : 'border-2 hover:border-blue-300'
                }`}
                onClick={() => setSelectedPreset(preset)}
              >
                PRESET {preset}
              </Button>
            ))}
          </div>
        </div>

        {/* Buy/Sell settings 토글 */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Settings Mode</label>
          <div className="flex gap-2">
            <Button
              variant={settingsMode === 'buy' ? 'default' : 'neutral'}
              className={`flex-1 h-10 font-semibold transition-all ${
                settingsMode === 'buy' 
                  ? 'bg-green-500 hover:bg-green-600 text-white border-green-500' 
                  : 'border-2 hover:border-green-300'
              }`}
              onClick={() => setSettingsMode('buy')}
            >
              Buy Settings
            </Button>
            <Button
              variant={settingsMode === 'sell' ? 'default' : 'neutral'}
              className={`flex-1 h-10 font-semibold transition-all ${
                settingsMode === 'sell' 
                  ? 'bg-red-500 hover:bg-red-600 text-white border-red-500' 
                  : 'border-2 hover:border-red-300'
              }`}
              onClick={() => setSettingsMode('sell')}
            >
              Sell Settings
            </Button>
          </div>
        </div>

        {/* 설정값 입력 */}
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
              <TrendingDown className="h-3 w-3" />
              SLIPPAGE
            </label>
            <Input
              value={presetSlippage}
              onChange={(e) => setPresetSlippage(e.target.value)}
              className="text-center h-8 text-lg font-semibold border-2 focus:ring-2 focus:ring-blue-500"
              placeholder="50"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
              <span>⛽</span>
              PRIORITY
            </label>
            <Input
              value={presetPriority}
              onChange={(e) => setPresetPriority(e.target.value)}
              className="text-center h-8 text-lg font-semibold border-2 focus:ring-2 focus:ring-orange-500"
              placeholder="105"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
              <span>💰</span>
              BRIBE
            </label>
            <Input
              value={presetBribe}
              onChange={(e) => setPresetBribe(e.target.value)}
              className="text-center h-8 text-lg font-semibold border-2 focus:ring-2 focus:ring-green-500"
              placeholder="0.001"
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