'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { BuyerState, ShopperState, CalculatorSettings, CountryOption } from '@/types/calculator';
import { calculateBuyer, calculateShopper, getEffectiveRate, formatCurrency } from '@/utils/calculator';

// 0. 國家資料設定
const COUNTRIES: CountryOption[] = [
  { code: 'JP', name: '日本', currency: 'JPY', flag: '🇯🇵', defaultRate: 0.215 },
  { code: 'US', name: '美國', currency: 'USD', flag: '🇺🇸', defaultRate: 31.5 },
  { code: 'UK', name: '英國', currency: 'GBP', flag: '🇬🇧', defaultRate: 40.5 },
  { code: 'EU', name: '歐洲', currency: 'EUR', flag: '🇪🇺', defaultRate: 34.5 },
  { code: 'KR', name: '韓國', currency: 'KRW', flag: '🇰🇷', defaultRate: 0.024 },
];

// 1. 子元件：封裝好的輸入框
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  prefix?: string;
  suffix?: string;
  tooltip?: string;
}
const InputGroup = ({ label, prefix, suffix, tooltip, className, ...props }: InputProps) => (
  <div className={`space-y-1 ${className}`}>
    <div className="flex items-center gap-1">
      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{label}</label>
      {tooltip && <span className="text-gray-300 cursor-help text-xs" title={tooltip}>ⓘ</span>}
    </div>
    <div className="relative flex items-center bg-gray-50 border border-gray-200 rounded-lg focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:bg-white focus-within:border-blue-400 transition-all">
      {prefix && <span className="pl-3 text-gray-400 text-sm font-medium">{prefix}</span>}
      <input 
        className="w-full p-2.5 bg-transparent outline-none text-sm font-medium text-gray-700 placeholder:text-gray-300" 
        type="number"
        min="0"
        onWheel={(e) => e.currentTarget.blur()} 
        {...props} 
      />
      {suffix && <span className="pr-3 text-gray-400 text-xs font-bold">{suffix}</span>}
    </div>
  </div>
);

// 2. 主計算機元件
export default function Calculator() {
  const [mode, setMode] = useState<'buyer' | 'shopper'>('buyer');
  const [loading, setLoading] = useState(true);

  // 全域設定 State
  const [settings, setSettings] = useState<CalculatorSettings>({
    countryCode: 'JP',
    fxRateMode: 'auto',
    manualFxRate: 0,
    liveFxRate: 0.215,
    lastUpdated: null,
  });

  // 表單 State
  const [buyerForm, setBuyerForm] = useState<BuyerState>({
    productPrice: 0, quantity: 1, discount: 0, shippingCost: 0, otherCost: 0,
    serviceFeeType: 'percent', serviceFeeValue: 10,
  });

  const [shopperForm, setShopperForm] = useState<ShopperState>({
    targetSellingPrice: 0, productCost: 0, shippingCost: 0, otherCost: 0, timeSpent: 0,
  });

  const currentCountry = useMemo(() => COUNTRIES.find(c => c.code === settings.countryCode) || COUNTRIES[0], [settings.countryCode]);

  // API 抓取匯率
  useEffect(() => {
    const fetchRate = async () => {
      setLoading(true);
      try {
        const res = await fetch('https://api.exchangerate-api.com/v4/latest/TWD');
        const data = await res.json();
        const rate = 1 / data.rates[currentCountry.currency]; // 反算匯率
        setSettings(prev => ({ ...prev, liveFxRate: rate, lastUpdated: new Date() }));
      } catch (error) {
        console.error('Rate error', error);
        setSettings(prev => ({ ...prev, liveFxRate: currentCountry.defaultRate }));
      } finally {
        setLoading(false);
      }
    };
    fetchRate();
  }, [currentCountry.currency]);

  // 即時計算
  const buyerResult = useMemo(() => calculateBuyer(buyerForm, settings), [buyerForm, settings]);
  const shopperResult = useMemo(() => calculateShopper(shopperForm, settings), [shopperForm, settings]);
  const activeRate = getEffectiveRate(settings);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('已複製明細到剪貼簿！');
  };

  return (
    <div className="flex flex-col h-full bg-white text-sm font-sans">
      
      {/* --- 頂部：切換模式 --- */}
      <div className="flex p-1 bg-gray-100 rounded-xl m-4 mb-2">
        <button onClick={() => setMode('buyer')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${mode === 'buyer' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>🛍️ 買家試算</button>
        <button onClick={() => setMode('shopper')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${mode === 'shopper' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>✈️ 代購獲利</button>
      </div>

      <div className="px-4 pb-4 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
        
        {/* --- 1. 國家與匯率設定 --- */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
             <label className="text-[10px] font-bold text-gray-400 uppercase">國家</label>
             <div className="flex items-center gap-1 text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">
                <span>1 {currentCountry.currency} ≈ {activeRate.toFixed(3)} TWD</span>
                {settings.fxRateMode === 'auto' && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"/>}
             </div>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {COUNTRIES.map((c) => (
              <button key={c.code} onClick={() => setSettings(s => ({ ...s, countryCode: c.code }))}
                className={`py-1.5 rounded-lg border text-xs font-bold flex flex-col items-center gap-0.5 transition-all ${settings.countryCode === c.code ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:bg-gray-50 text-gray-600'}`}>
                <span className="text-base">{c.flag}</span>
                <span className="text-[9px] scale-90">{c.currency}</span>
              </button>
            ))}
          </div>
          
          {/* 匯率手動切換小開關 */}
          <div className="flex items-center justify-end gap-2 pt-1">
             <label className="text-[10px] text-gray-400">自訂匯率</label>
             <div className="flex bg-gray-100 rounded p-0.5">
                <button onClick={() => setSettings(s => ({ ...s, fxRateMode: 'auto' }))} className={`px-2 py-0.5 text-[10px] rounded transition ${settings.fxRateMode === 'auto' ? 'bg-white shadow-sm font-bold' : 'text-gray-400'}`}>Auto</button>
                <button onClick={() => setSettings(s => ({ ...s, fxRateMode: 'manual' }))} className={`px-2 py-0.5 text-[10px] rounded transition ${settings.fxRateMode === 'manual' ? 'bg-white shadow-sm font-bold' : 'text-gray-400'}`}>Set</button>
             </div>
          </div>
          {settings.fxRateMode === 'manual' && (
            <InputGroup label="輸入匯率" value={settings.manualFxRate || ''} onChange={(e) => setSettings(s => ({ ...s, manualFxRate: parseFloat(e.target.value) }))} />
          )}
        </div>

        <hr className="border-dashed border-gray-200"/>

        {/* --- 2. 表單區域 --- */}
        {mode === 'buyer' ? (
          <div className="space-y-3 animate-fade-in">
             <div className="grid grid-cols-2 gap-3">
                <InputGroup label={`單價 (${currentCountry.currency})`} value={buyerForm.productPrice || ''} onChange={(e) => setBuyerForm(p => ({ ...p, productPrice: parseFloat(e.target.value) }))} />
                <InputGroup label="數量" value={buyerForm.quantity} onChange={(e) => setBuyerForm(p => ({ ...p, quantity: parseFloat(e.target.value) }))} />
             </div>
             <div className="grid grid-cols-2 gap-3">
                <InputGroup label="折扣 (原幣)" prefix="-" value={buyerForm.discount || ''} onChange={(e) => setBuyerForm(p => ({ ...p, discount: parseFloat(e.target.value) }))} />
                <InputGroup label="國際運費" value={buyerForm.shippingCost || ''} onChange={(e) => setBuyerForm(p => ({ ...p, shippingCost: parseFloat(e.target.value) }))} />
             </div>
             
             {/* 代購費特殊區塊 */}
             <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 space-y-2">
                <div className="flex justify-between items-center">
                   <label className="text-[10px] font-bold text-blue-800">代購服務費</label>
                   <div className="flex gap-1">
                      {[10, 12, 15].map(rate => (
                        <button key={rate} onClick={() => setBuyerForm(p => ({ ...p, serviceFeeValue: rate, serviceFeeType: 'percent' }))} className="text-[9px] px-1.5 py-0.5 bg-white border border-blue-200 rounded text-blue-600 hover:bg-blue-50 transition">{rate}%</button>
                      ))}
                   </div>
                </div>
                <div className="flex gap-2">
                   <select className="bg-white border border-blue-200 rounded-lg px-2 text-xs font-bold text-gray-600 outline-none h-9" value={buyerForm.serviceFeeType} onChange={(e) => setBuyerForm(p => ({ ...p, serviceFeeType: e.target.value as any }))}>
                      <option value="percent">%</option>
                      <option value="fixed">$</option>
                   </select>
                   <input type="number" className="flex-1 px-3 rounded-lg border border-blue-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" value={buyerForm.serviceFeeValue} onChange={(e) => setBuyerForm(p => ({ ...p, serviceFeeValue: parseFloat(e.target.value) }))} />
                </div>
             </div>
             <InputGroup label="其他雜支 (原幣)" tooltip="如當地運費、包材等" value={buyerForm.otherCost || ''} onChange={(e) => setBuyerForm(p => ({ ...p, otherCost: parseFloat(e.target.value) }))} />
          </div>
        ) : (
          <div className="space-y-3 animate-fade-in">
             <InputGroup label="預計售價 (台幣)" prefix="$" className="border-orange-200" value={shopperForm.targetSellingPrice || ''} onChange={(e) => setShopperForm(p => ({ ...p, targetSellingPrice: parseFloat(e.target.value) }))} />
             <div className="grid grid-cols-2 gap-3">
                <InputGroup label={`成本 (${currentCountry.currency})`} tooltip="商品實際入手價" value={shopperForm.productCost || ''} onChange={(e) => setShopperForm(p => ({ ...p, productCost: parseFloat(e.target.value) }))} />
                <InputGroup label={`運費 (${currentCountry.currency})`} value={shopperForm.shippingCost || ''} onChange={(e) => setShopperForm(p => ({ ...p, shippingCost: parseFloat(e.target.value) }))} />
             </div>
             <div className="grid grid-cols-2 gap-3">
                <InputGroup label={`雜支 (${currentCountry.currency})`} value={shopperForm.otherCost || ''} onChange={(e) => setShopperForm(p => ({ ...p, otherCost: parseFloat(e.target.value) }))} />
                <InputGroup label="工時 (小時)" value={shopperForm.timeSpent || ''} onChange={(e) => setShopperForm(p => ({ ...p, timeSpent: parseFloat(e.target.value) }))} />
             </div>
          </div>
        )}
      </div>

      {/* --- 3. 結果卡片 (Sticky Bottom) --- */}
      <div className={`p-5 border-t transition-colors duration-300 ${mode === 'buyer' ? 'bg-slate-50 border-slate-100' : 'bg-orange-50 border-orange-100'}`}>
        {mode === 'buyer' ? (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-500"><span>商品小計</span><span>{formatCurrency(buyerResult.productTotalTWD)}</span></div>
            <div className="flex justify-between text-xs text-gray-500"><span>運費+雜支</span><span>+{formatCurrency(buyerResult.shippingTWD + buyerResult.otherTWD)}</span></div>
            <div className="flex justify-between text-xs font-bold text-blue-600"><span>代購費</span><span>+{formatCurrency(buyerResult.serviceFeeTWD)}</span></div>
            <div className="pt-2 border-t border-gray-200 flex justify-between items-end">
               <span className="text-xs font-bold text-gray-500">預估總價</span>
               <span className="text-2xl font-black text-blue-600 tracking-tight">{formatCurrency(buyerResult.totalTWD)}</span>
            </div>
            <button onClick={() => copyToClipboard(buyerResult.breakdown)} className="w-full py-2 mt-1 bg-white border border-gray-200 text-gray-600 text-[10px] font-bold rounded-lg hover:bg-gray-50 active:scale-95 transition shadow-sm">📄 複製明細</button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-500"><span>總成本</span><span>-{formatCurrency(shopperResult.totalCostTWD)}</span></div>
            <div className="flex gap-2 mt-1">
               <div className="flex-1 bg-white p-1.5 rounded border border-orange-100 text-center"><p className="text-[9px] text-gray-400">利潤率</p><p className={`font-bold ${shopperResult.profitMargin > 20 ? 'text-green-600' : 'text-gray-700'}`}>{shopperResult.profitMargin.toFixed(1)}%</p></div>
               <div className="flex-1 bg-white p-1.5 rounded border border-orange-100 text-center"><p className="text-[9px] text-gray-400">時薪</p><p className="font-bold text-gray-700">{formatCurrency(shopperResult.hourlyWage)}</p></div>
            </div>
            <div className="pt-2 border-t border-orange-200 flex justify-between items-end">
               <span className="text-xs font-bold text-orange-800">預估淨利</span>
               <span className="text-2xl font-black text-orange-600 tracking-tight">{formatCurrency(shopperResult.netProfit)}</span>
            </div>
            <button onClick={() => copyToClipboard(shopperResult.breakdown)} className="w-full py-2 mt-1 bg-orange-100 text-orange-700 border border-orange-200 text-[10px] font-bold rounded-lg hover:bg-orange-200 active:scale-95 transition shadow-sm">📄 複製分析</button>
          </div>
        )}
      </div>
    </div>
  );
}