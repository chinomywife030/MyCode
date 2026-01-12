'use client';

import React, { useState, useEffect, useMemo } from 'react';

// --- 1. 定義型別 (直接整合在這裡，解決找不到 types 的問題) ---
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

// --- 2. 工具元件與函式 ---
const formatCurrency = (amount: number) => {
  if (isNaN(amount)) return '$0';
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// 重用的輸入框樣式
const InputGroup = ({ label, prefix, suffix, tooltip, className, ...props }: any) => (
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

// --- 3. 主元件 ---
export default function CalculatorModal({ onClose }: { onClose: () => void }) {
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
  
  // 計算有效匯率
  const activeRate = settings.fxRateMode === 'manual' && settings.manualFxRate > 0 
    ? settings.manualFxRate 
    : settings.liveFxRate;

  // 抓取匯率 API
  useEffect(() => {
    const fetchRate = async () => {
      try {
        const res = await fetch(`https://api.exchangerate-api.com/v4/latest/${currentCountry.currency}`);
        const data = await res.json();
        if (data.rates['TWD']) {
          setSettings(prev => ({ ...prev, liveFxRate: data.rates['TWD'] }));
        }
      } catch (error) {
        console.error('Rate error', error);
      }
    };
    fetchRate();
  }, [currentCountry.currency]);

  // 買家試算邏輯
  const buyerResult = useMemo(() => {
    const productTotalNative = (buyerForm.productPrice * buyerForm.quantity) - buyerForm.discount;
    const productTotalTWD = Math.max(0, productTotalNative * activeRate);
    const shippingTWD = buyerForm.shippingCost * activeRate;
    const otherTWD = buyerForm.otherCost * activeRate;
    
    let serviceFeeTWD = 0;
    if (buyerForm.serviceFeeType === 'percent') {
      serviceFeeTWD = productTotalTWD * (buyerForm.serviceFeeValue / 100);
    } else {
      serviceFeeTWD = buyerForm.serviceFeeValue;
    }
    
    const totalTWD = productTotalTWD + shippingTWD + otherTWD + serviceFeeTWD;
    
    const breakdown = `
🛍️ 代購試算 (${currentCountry.name})
匯率：${activeRate.toFixed(3)}
商品：${formatCurrency(productTotalTWD)}
運雜：${formatCurrency(shippingTWD + otherTWD)}
代購費：${formatCurrency(serviceFeeTWD)}
----------------
總計：${formatCurrency(totalTWD)}`.trim();

    return { productTotalTWD, shippingTWD, otherTWD, serviceFeeTWD, totalTWD, breakdown };
  }, [buyerForm, activeRate, currentCountry.name]);

  // 代購獲利邏輯
  const shopperResult = useMemo(() => {
    const totalCostNative = shopperForm.productCost + shopperForm.shippingCost + shopperForm.otherCost;
    const totalCostTWD = totalCostNative * activeRate;
    const netProfit = shopperForm.targetSellingPrice - totalCostTWD;
    const profitMargin = shopperForm.targetSellingPrice > 0 ? (netProfit / shopperForm.targetSellingPrice) * 100 : 0;
    const hourlyWage = shopperForm.timeSpent > 0 ? netProfit / shopperForm.timeSpent : 0;

    const breakdown = `
✈️ 代購獲利 (${currentCountry.name})
匯率：${activeRate.toFixed(3)}
售價：${formatCurrency(shopperForm.targetSellingPrice)}
成本：${formatCurrency(totalCostTWD)}
----------------
淨利：${formatCurrency(netProfit)} (利潤 ${profitMargin.toFixed(1)}%)`.trim();

    return { totalCostTWD, netProfit, profitMargin, hourlyWage, breakdown };
  }, [shopperForm, activeRate, currentCountry.name]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('已複製！');
  };

  return (
    // 外層固定滿版遮罩
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* 背景模糊點擊關閉 */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      {/* 計算機本體 */}
      <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200 ring-1 ring-gray-900/5">
        
        {/* 標題列 */}
        <div className="flex justify-between items-center px-5 py-4 border-b bg-gray-50/50">
          <h3 className="font-black text-gray-800 flex items-center gap-2 text-lg">
            <span className="text-2xl">🧮</span> 匯率計算機
          </h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition">✕</button>
        </div>

        {/* 模式切換 */}
        <div className="px-5 pt-5 pb-2">
          <div className="flex p-1 bg-gray-100 rounded-xl">
              <button onClick={() => setMode('buyer')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${mode === 'buyer' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>🛍️ 買家試算</button>
              <button onClick={() => setMode('shopper')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${mode === 'shopper' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>✈️ 代購獲利</button>
          </div>
        </div>

        {/* 捲動內容區 */}
        <div className="px-5 pb-4 space-y-5 overflow-y-auto custom-scrollbar flex-1">
            {/* 國家與匯率 */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">選擇幣別</label>
                  <div className="flex items-center gap-1 text-[10px] font-medium text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">
                  <span>1 {currentCountry.currency} ≈ {activeRate.toFixed(3)} TWD</span>
                  {settings.fxRateMode === 'auto' && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"/>}
                  </div>
              </div>
              <div className="grid grid-cols-5 gap-2">
                  {COUNTRIES.map((c) => (
                  <button key={c.code} onClick={() => setSettings(s => ({ ...s, countryCode: c.code }))}
                      className={`py-2 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${settings.countryCode === c.code ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500' : 'border-gray-200 hover:bg-gray-50 text-gray-600'}`}>
                      <span className="text-lg leading-none">{c.flag}</span>
                      <span className="text-[10px]">{c.currency}</span>
                  </button>
                  ))}
              </div>
              
              {/* 自訂匯率開關 */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-dashed border-gray-100 mt-2">
                  <label className="text-[10px] text-gray-400">自訂匯率</label>
                  <div className="flex items-center gap-2">
                    {settings.fxRateMode === 'manual' && (
                        <input type="number" className="w-20 px-2 py-0.5 text-right text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none" placeholder="輸入匯率" value={settings.manualFxRate || ''} onChange={(e) => setSettings(s => ({ ...s, manualFxRate: parseFloat(e.target.value) }))} />
                    )}
                    <div className="flex bg-gray-100 rounded p-0.5">
                      <button onClick={() => setSettings(s => ({ ...s, fxRateMode: 'auto' }))} className={`px-2 py-0.5 text-[10px] rounded transition ${settings.fxRateMode === 'auto' ? 'bg-white shadow-sm font-bold text-gray-700' : 'text-gray-400'}`}>Auto</button>
                      <button onClick={() => setSettings(s => ({ ...s, fxRateMode: 'manual' }))} className={`px-2 py-0.5 text-[10px] rounded transition ${settings.fxRateMode === 'manual' ? 'bg-white shadow-sm font-bold text-gray-700' : 'text-gray-400'}`}>Set</button>
                    </div>
                  </div>
              </div>
            </div>

            {/* 輸入表單 */}
            {mode === 'buyer' ? (
              <div className="space-y-3 animate-fade-in">
                  <div className="grid grid-cols-2 gap-3">
                      <InputGroup label={`單價 (${currentCountry.currency})`} value={buyerForm.productPrice || ''} onChange={(e: any) => setBuyerForm(p => ({ ...p, productPrice: parseFloat(e.target.value) }))} />
                      <InputGroup label="數量" value={buyerForm.quantity} onChange={(e: any) => setBuyerForm(p => ({ ...p, quantity: parseFloat(e.target.value) }))} />
                  </div>
                  <InputGroup label="折扣 (原幣)" prefix="-" value={buyerForm.discount || ''} onChange={(e: any) => setBuyerForm(p => ({ ...p, discount: parseFloat(e.target.value) }))} />
                  
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
                  <div className="grid grid-cols-2 gap-3">
                    <InputGroup label="國際運費 (原幣)" value={buyerForm.shippingCost || ''} onChange={(e: any) => setBuyerForm(p => ({ ...p, shippingCost: parseFloat(e.target.value) }))} />
                    <InputGroup label="其他雜支 (原幣)" value={buyerForm.otherCost || ''} onChange={(e: any) => setBuyerForm(p => ({ ...p, otherCost: parseFloat(e.target.value) }))} />
                  </div>
              </div>
            ) : (
              <div className="space-y-3 animate-fade-in">
                  <InputGroup label="預計售價 (台幣)" prefix="$" className="border-orange-200" value={shopperForm.targetSellingPrice || ''} onChange={(e: any) => setShopperForm(p => ({ ...p, targetSellingPrice: parseFloat(e.target.value) }))} />
                  <div className="grid grid-cols-2 gap-3">
                      <InputGroup label={`成本 (${currentCountry.currency})`} tooltip="商品實際入手價" value={shopperForm.productCost || ''} onChange={(e: any) => setShopperForm(p => ({ ...p, productCost: parseFloat(e.target.value) }))} />
                      <InputGroup label={`運費 (${currentCountry.currency})`} value={shopperForm.shippingCost || ''} onChange={(e: any) => setShopperForm(p => ({ ...p, shippingCost: parseFloat(e.target.value) }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                      <InputGroup label={`雜支 (${currentCountry.currency})`} value={shopperForm.otherCost || ''} onChange={(e: any) => setShopperForm(p => ({ ...p, otherCost: parseFloat(e.target.value) }))} />
                      <InputGroup label="工時 (小時)" value={shopperForm.timeSpent || ''} onChange={(e: any) => setShopperForm(p => ({ ...p, timeSpent: parseFloat(e.target.value) }))} />
                  </div>
              </div>
            )}
        </div>

        {/* 底部結果區 */}
        <div className={`p-5 border-t transition-colors duration-300 mt-auto ${mode === 'buyer' ? 'bg-slate-50 border-slate-100' : 'bg-orange-50 border-orange-100'}`}>
            {mode === 'buyer' ? (
            <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-500"><span>商品小計</span><span>{formatCurrency(buyerResult.productTotalTWD)}</span></div>
                <div className="flex justify-between text-xs text-gray-500"><span>運費+雜支</span><span>+{formatCurrency(buyerResult.shippingTWD + buyerResult.otherTWD)}</span></div>
                <div className="flex justify-between text-xs font-bold text-blue-600"><span>代購費</span><span>+{formatCurrency(buyerResult.serviceFeeTWD)}</span></div>
                <div className="pt-2 border-t border-gray-200 flex justify-between items-end">
                  <span className="text-xs font-bold text-gray-500">預估總價</span>
                  <span className="text-2xl font-black text-blue-600 tracking-tight">{formatCurrency(buyerResult.totalTWD)}</span>
                </div>
                <button onClick={() => copyToClipboard(buyerResult.breakdown)} className="w-full py-2.5 mt-2 bg-white border border-gray-200 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-50 active:scale-95 transition shadow-sm flex items-center justify-center gap-1">
                  <span>📋</span> 複製報價明細
                </button>
            </div>
            ) : (
            <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-500"><span>總成本</span><span>-{formatCurrency(shopperResult.totalCostTWD)}</span></div>
                <div className="flex gap-2 mt-1">
                  <div className="flex-1 bg-white p-2 rounded-lg border border-orange-100 text-center shadow-sm"><p className="text-[10px] text-gray-400 font-bold uppercase">利潤率</p><p className={`text-sm font-black ${shopperResult.profitMargin > 20 ? 'text-green-600' : 'text-gray-700'}`}>{shopperResult.profitMargin.toFixed(1)}%</p></div>
                  <div className="flex-1 bg-white p-2 rounded-lg border border-orange-100 text-center shadow-sm"><p className="text-[10px] text-gray-400 font-bold uppercase">時薪</p><p className="text-sm font-black text-gray-700">{formatCurrency(shopperResult.hourlyWage)}</p></div>
                </div>
                <div className="pt-2 border-t border-orange-200 flex justify-between items-end">
                  <span className="text-xs font-bold text-orange-800">預估淨利</span>
                  <span className="text-2xl font-black text-orange-600 tracking-tight">{formatCurrency(shopperResult.netProfit)}</span>
                </div>
                <button onClick={() => copyToClipboard(shopperResult.breakdown)} className="w-full py-2.5 mt-2 bg-orange-100 text-orange-700 border border-orange-200 text-xs font-bold rounded-lg hover:bg-orange-200 active:scale-95 transition shadow-sm flex items-center justify-center gap-1">
                  <span>📋</span> 複製獲利分析
                </button>
            </div>
            )}
        </div>
      </div>
    </div>
  );
}