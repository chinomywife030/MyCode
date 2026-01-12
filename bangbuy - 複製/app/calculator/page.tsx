'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

// --- 型別定義 ---
interface CalculatorSettings {
  countryCode: string;
  fxRateMode: 'auto' | 'manual';
  manualFxRate: number;
  liveFxRate: number;
}

interface BuyerState {
  productPrice: number;
  quantity: number;
  discount: number;
  shippingCost: number;
  otherCost: number;
  serviceFeeType: 'percent' | 'fixed';
  serviceFeeValue: number;
}

interface ShopperState {
  targetSellingPrice: number;
  productCost: number;
  shippingCost: number;
  otherCost: number;
  timeSpent: number;
}

const COUNTRIES = [
  { code: 'JP', name: '日本', currency: 'JPY', flag: '🇯🇵', defaultRate: 0.215 },
  { code: 'US', name: '美國', currency: 'USD', flag: '🇺🇸', defaultRate: 31.5 },
  { code: 'UK', name: '英國', currency: 'GBP', flag: '🇬🇧', defaultRate: 40.5 },
  { code: 'EU', name: '歐洲', currency: 'EUR', flag: '🇪🇺', defaultRate: 34.5 },
  { code: 'KR', name: '韓國', currency: 'KRW', flag: '🇰🇷', defaultRate: 0.024 },
];

// --- 工具 ---
const formatCurrency = (amount: number) => {
  if (isNaN(amount)) return '$0';
  return new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
};

interface InputGroupProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  prefix?: string;
  suffix?: string;
  tooltip?: string;
  className?: string;
}

const InputGroup = ({ label, prefix, suffix, tooltip, className, ...props }: InputGroupProps) => (
  <div className={`space-y-1 ${className}`}>
    <div className="flex items-center gap-1">
      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{label}</label>
      {tooltip && <span className="text-gray-300 cursor-help text-xs" title={tooltip}>ⓘ</span>}
    </div>
    <div className="relative flex items-center bg-gray-50 border border-gray-200 rounded-lg focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:bg-white focus-within:border-blue-400 transition-all">
      {prefix && <span className="pl-3 text-gray-400 text-sm font-medium">{prefix}</span>}
      <input className="w-full p-2.5 bg-transparent outline-none text-sm font-medium text-gray-700 placeholder:text-gray-300" type="number" min="0" onWheel={(e) => e.currentTarget.blur()} {...props} />
      {suffix && <span className="pr-3 text-gray-400 text-xs font-bold">{suffix}</span>}
    </div>
  </div>
);

export default function CalculatorPage() {
  const [mode, setMode] = useState<'buyer' | 'shopper'>('buyer');
  
  const [settings, setSettings] = useState<CalculatorSettings>({
    countryCode: 'JP',
    fxRateMode: 'auto',
    manualFxRate: 0,
    liveFxRate: 0.215,
  });

  const [buyerForm, setBuyerForm] = useState<BuyerState>({
    productPrice: 0, quantity: 1, discount: 0, shippingCost: 0, otherCost: 0,
    serviceFeeType: 'percent', serviceFeeValue: 10,
  });

  const [shopperForm, setShopperForm] = useState<ShopperState>({
    targetSellingPrice: 0, productCost: 0, shippingCost: 0, otherCost: 0, timeSpent: 0,
  });

  const currentCountry = useMemo(() => COUNTRIES.find(c => c.code === settings.countryCode) || COUNTRIES[0], [settings.countryCode]);
  const activeRate = settings.fxRateMode === 'manual' && settings.manualFxRate > 0 ? settings.manualFxRate : settings.liveFxRate;

  useEffect(() => {
    const fetchRate = async () => {
      try {
        const res = await fetch(`https://api.exchangerate-api.com/v4/latest/${currentCountry.currency}`);
        const data = await res.json();
        if (data.rates['TWD']) setSettings(prev => ({ ...prev, liveFxRate: data.rates['TWD'] }));
      } catch (error) { console.error('Rate error', error); }
    };
    fetchRate();
  }, [currentCountry.currency]);

  // 計算邏輯 (簡化顯示)
  const buyerResult = useMemo(() => {
    const productTotalNative = (buyerForm.productPrice * buyerForm.quantity) - buyerForm.discount;
    const productTotalTWD = Math.max(0, productTotalNative * activeRate);
    const shippingTWD = buyerForm.shippingCost * activeRate;
    const otherTWD = buyerForm.otherCost * activeRate;
    const serviceFeeTWD = buyerForm.serviceFeeType === 'percent' ? productTotalTWD * (buyerForm.serviceFeeValue / 100) : buyerForm.serviceFeeValue;
    const totalTWD = productTotalTWD + shippingTWD + otherTWD + serviceFeeTWD;
    
    const breakdown = `🛍️ 代購試算 (${currentCountry.name})\n匯率：${activeRate.toFixed(3)}\n商品：${formatCurrency(productTotalTWD)}\n運雜：${formatCurrency(shippingTWD + otherTWD)}\n代購費：${formatCurrency(serviceFeeTWD)}\n----------------\n總計：${formatCurrency(totalTWD)}`;
    return { productTotalTWD, shippingTWD, otherTWD, serviceFeeTWD, totalTWD, breakdown };
  }, [buyerForm, activeRate, currentCountry.name]);

  const shopperResult = useMemo(() => {
    const totalCostNative = shopperForm.productCost + shopperForm.shippingCost + shopperForm.otherCost;
    const totalCostTWD = totalCostNative * activeRate;
    const netProfit = shopperForm.targetSellingPrice - totalCostTWD;
    const profitMargin = shopperForm.targetSellingPrice > 0 ? (netProfit / shopperForm.targetSellingPrice) * 100 : 0;
    const hourlyWage = shopperForm.timeSpent > 0 ? netProfit / shopperForm.timeSpent : 0;

    const breakdown = `✈️ 代購獲利 (${currentCountry.name})\n匯率：${activeRate.toFixed(3)}\n售價：${formatCurrency(shopperForm.targetSellingPrice)}\n成本：${formatCurrency(totalCostTWD)}\n----------------\n淨利：${formatCurrency(netProfit)} (利潤 ${profitMargin.toFixed(1)}%)`;
    return { totalCostTWD, netProfit, profitMargin, hourlyWage, breakdown };
  }, [shopperForm, activeRate, currentCountry.name]);

  const copyToClipboard = (text: string) => { navigator.clipboard.writeText(text); alert('已複製！'); };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden ring-1 ring-black/5 animate-in slide-in-from-bottom-4 duration-500">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b bg-white relative z-10">
           <Link href="/" className="text-gray-400 hover:text-gray-700 transition flex items-center gap-1 text-sm font-bold">
             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" /></svg>
             回首頁
           </Link>
           <h3 className="font-black text-gray-800 text-lg flex items-center gap-2"><span className="text-2xl">🧮</span> 匯率計算機</h3>
           <div className="w-16"></div> {/* Spacer for centering */}
        </div>

        {/* 模式切換 */}
        <div className="px-6 pt-6 pb-2">
          <div className="flex p-1.5 bg-gray-100 rounded-xl">
             <button onClick={() => setMode('buyer')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${mode === 'buyer' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>🛍️ 買家試算</button>
             <button onClick={() => setMode('shopper')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${mode === 'shopper' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>✈️ 代購獲利</button>
          </div>
        </div>

        {/* 內容區 */}
        <div className="px-6 pb-6 space-y-6">
           {/* 國家選擇 */}
           <div className="space-y-3">
              <div className="flex justify-between items-center px-1">
                 <label className="text-[10px] font-bold text-gray-400 uppercase">選擇幣別</label>
                 <span className="text-[10px] font-medium text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">1 {currentCountry.currency} ≈ {activeRate.toFixed(3)} TWD</span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                 {COUNTRIES.map((c) => (
                   <button key={c.code} onClick={() => setSettings(s => ({ ...s, countryCode: c.code }))} className={`py-2 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${settings.countryCode === c.code ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500' : 'border-gray-200 hover:bg-gray-50 text-gray-600'}`}>
                     <span className="text-xl">{c.flag}</span><span className="text-[10px]">{c.currency}</span>
                   </button>
                 ))}
              </div>
              {/* 自訂匯率 */}
              <div className="flex items-center justify-end gap-2 pt-1">
                 {settings.fxRateMode === 'manual' && <input type="number" className="w-20 px-2 py-0.5 text-right text-xs border border-gray-300 rounded outline-none focus:border-blue-500" placeholder="匯率" value={settings.manualFxRate || ''} onChange={(e) => setSettings(s => ({ ...s, manualFxRate: parseFloat(e.target.value) }))} />}
                 <div className="flex bg-gray-100 rounded p-0.5">
                   <button onClick={() => setSettings(s => ({ ...s, fxRateMode: 'auto' }))} className={`px-2 py-0.5 text-[10px] rounded font-bold transition ${settings.fxRateMode === 'auto' ? 'bg-white shadow text-gray-800' : 'text-gray-400'}`}>Auto</button>
                   <button onClick={() => setSettings(s => ({ ...s, fxRateMode: 'manual' }))} className={`px-2 py-0.5 text-[10px] rounded font-bold transition ${settings.fxRateMode === 'manual' ? 'bg-white shadow text-gray-800' : 'text-gray-400'}`}>Set</button>
                 </div>
              </div>
           </div>
           <hr className="border-dashed border-gray-200"/>

           {/* 輸入表單 (省略細節，邏輯同前，僅保留結構) */}
           {mode === 'buyer' ? (
              <div className="space-y-4 animate-fade-in">
                  <div className="grid grid-cols-2 gap-4">
                      <InputGroup label={`單價 (${currentCountry.currency})`} value={buyerForm.productPrice || ''} onChange={(e) => setBuyerForm(p => ({ ...p, productPrice: parseFloat(e.target.value) || 0 }))} />
                      <InputGroup label="數量" value={buyerForm.quantity} onChange={(e) => setBuyerForm(p => ({ ...p, quantity: parseFloat(e.target.value) || 0 }))} />
                  </div>
                  <InputGroup label="折扣 (原幣)" prefix="-" value={buyerForm.discount || ''} onChange={(e) => setBuyerForm(p => ({ ...p, discount: parseFloat(e.target.value) || 0 }))} />
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 space-y-3">
                      <div className="flex justify-between items-center">
                         <label className="text-[10px] font-bold text-blue-800">代購服務費</label>
                         <div className="flex gap-1">{[10, 12, 15].map(rate => (<button key={rate} onClick={() => setBuyerForm(p => ({ ...p, serviceFeeValue: rate, serviceFeeType: 'percent' }))} className="text-[9px] px-1.5 py-0.5 bg-white border border-blue-200 rounded text-blue-600 hover:bg-blue-50">{rate}%</button>))}</div>
                      </div>
                      <div className="flex gap-2">
                        <select className="bg-white border border-blue-200 rounded-lg px-2 text-xs font-bold text-gray-600 h-10 outline-none" value={buyerForm.serviceFeeType} onChange={(e) => setBuyerForm(p => ({ ...p, serviceFeeType: e.target.value as 'percent' | 'fixed' }))}><option value="percent">%</option><option value="fixed">$</option></select>
                        <input type="number" className="flex-1 px-3 rounded-lg border border-blue-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" value={buyerForm.serviceFeeValue} onChange={(e) => setBuyerForm(p => ({ ...p, serviceFeeValue: parseFloat(e.target.value) }))} />
                      </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <InputGroup label="國際運費" value={buyerForm.shippingCost || ''} onChange={(e) => setBuyerForm(p => ({ ...p, shippingCost: parseFloat(e.target.value) || 0 }))} />
                    <InputGroup label="其他雜支" value={buyerForm.otherCost || ''} onChange={(e) => setBuyerForm(p => ({ ...p, otherCost: parseFloat(e.target.value) || 0 }))} />
                  </div>
              </div>
           ) : (
              // Shopper form (略，同上，僅結構)
              <div className="space-y-4 animate-fade-in">
                  <InputGroup label="預計售價 (台幣)" prefix="$" className="border-orange-200" value={shopperForm.targetSellingPrice || ''} onChange={(e) => setShopperForm(p => ({ ...p, targetSellingPrice: parseFloat(e.target.value) || 0 }))} />
                  <div className="grid grid-cols-2 gap-4">
                      <InputGroup label="成本" value={shopperForm.productCost || ''} onChange={(e) => setShopperForm(p => ({ ...p, productCost: parseFloat(e.target.value) || 0 }))} />
                      <InputGroup label="運費" value={shopperForm.shippingCost || ''} onChange={(e) => setShopperForm(p => ({ ...p, shippingCost: parseFloat(e.target.value) || 0 }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <InputGroup label="雜支" value={shopperForm.otherCost || ''} onChange={(e) => setShopperForm(p => ({ ...p, otherCost: parseFloat(e.target.value) || 0 }))} />
                      <InputGroup label="工時" value={shopperForm.timeSpent || ''} onChange={(e) => setShopperForm(p => ({ ...p, timeSpent: parseFloat(e.target.value) || 0 }))} />
                  </div>
              </div>
           )}
        </div>

        {/* 底部結果 */}
        <div className={`p-6 border-t transition-colors duration-300 ${mode === 'buyer' ? 'bg-slate-50 border-slate-100' : 'bg-orange-50 border-orange-100'}`}>
            {mode === 'buyer' ? (
            <div className="space-y-3">
                <div className="flex justify-between text-xs text-gray-500"><span>商品小計</span><span>{formatCurrency(buyerResult.productTotalTWD)}</span></div>
                <div className="flex justify-between text-xs text-gray-500"><span>運費+雜支</span><span>+{formatCurrency(buyerResult.shippingTWD + buyerResult.otherTWD)}</span></div>
                <div className="flex justify-between text-xs font-bold text-blue-600"><span>代購費</span><span>+{formatCurrency(buyerResult.serviceFeeTWD)}</span></div>
                <div className="pt-3 border-t border-gray-200 flex justify-between items-end">
                  <span className="text-xs font-bold text-gray-500">預估總價</span>
                  <span className="text-3xl font-black text-blue-600 tracking-tight">{formatCurrency(buyerResult.totalTWD)}</span>
                </div>
                <button onClick={() => copyToClipboard(buyerResult.breakdown)} className="w-full py-3 mt-2 bg-white border border-gray-200 text-gray-600 text-sm font-bold rounded-xl hover:bg-gray-50 active:scale-95 transition shadow-sm flex items-center justify-center gap-2">📋 複製報價明細</button>
            </div>
            ) : (
            <div className="space-y-3">
                <div className="flex justify-between text-xs text-gray-500"><span>總成本</span><span>-{formatCurrency(shopperResult.totalCostTWD)}</span></div>
                <div className="flex gap-3 mt-1">
                  <div className="flex-1 bg-white p-3 rounded-xl border border-orange-100 text-center shadow-sm"><p className="text-[10px] text-gray-400 font-bold uppercase">利潤率</p><p className={`text-lg font-black ${shopperResult.profitMargin > 20 ? 'text-green-600' : 'text-gray-700'}`}>{shopperResult.profitMargin.toFixed(1)}%</p></div>
                  <div className="flex-1 bg-white p-3 rounded-xl border border-orange-100 text-center shadow-sm"><p className="text-[10px] text-gray-400 font-bold uppercase">時薪</p><p className="text-lg font-black text-gray-700">{formatCurrency(shopperResult.hourlyWage)}</p></div>
                </div>
                <div className="pt-3 border-t border-orange-200 flex justify-between items-end">
                  <span className="text-xs font-bold text-orange-800">預估淨利</span>
                  <span className="text-3xl font-black text-orange-600 tracking-tight">{formatCurrency(shopperResult.netProfit)}</span>
                </div>
                <button onClick={() => copyToClipboard(shopperResult.breakdown)} className="w-full py-3 mt-2 bg-orange-100 text-orange-700 border border-orange-200 text-sm font-bold rounded-xl hover:bg-orange-200 active:scale-95 transition shadow-sm flex items-center justify-center gap-2">📋 複製獲利分析</button>
            </div>
            )}
        </div>
      </div>
    </div>
  );
}