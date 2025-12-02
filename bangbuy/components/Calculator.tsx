'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { BuyerState, ShopperState, CountryProfile } from '@/types/calculator';
import { calculateBuyerCost, calculateShopperProfit } from '@/utils/calc';

// 預設國家資料 (這裡把德國改成了歐洲)
const DEFAULT_COUNTRIES: CountryProfile[] = [
  { code: 'JP', name: '🇯🇵 日本', currency: 'JPY', defaultFxRate: 0.22 },
  { code: 'US', name: '🇺🇸 美國', currency: 'USD', defaultFxRate: 32.5 },
  { code: 'UK', name: '🇬🇧 英國', currency: 'GBP', defaultFxRate: 41.5 },
  { code: 'EU', name: '🇪🇺 歐洲', currency: 'EUR', defaultFxRate: 35.5 }, // 👈 改成歐洲
  { code: 'KR', name: '🇰🇷 韓國', currency: 'KRW', defaultFxRate: 0.024 },
];

export default function Calculator() {
  const [activeTab, setActiveTab] = useState<'buyer' | 'shopper'>('buyer');
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});
  const [loadingRates, setLoadingRates] = useState(true);

  // --- 1. 抓取即時匯率 ---
  useEffect(() => {
    async function fetchRates() {
      try {
        const res = await fetch('https://api.exchangerate-api.com/v4/latest/TWD');
        const data = await res.json();
        
        // API 回傳的是 1 TWD = X 外幣，我們需要反過來 (1 外幣 = ? TWD)
        const rates = {
          JPY: 1 / data.rates.JPY,
          USD: 1 / data.rates.USD,
          KRW: 1 / data.rates.KRW,
          GBP: 1 / data.rates.GBP,
          EUR: 1 / data.rates.EUR,
        };
        setExchangeRates(rates);
        setLoadingRates(false);
      } catch (e) {
        console.error("匯率抓取失敗，使用預設值", e);
        setLoadingRates(false);
      }
    }
    fetchRates();
  }, []);

  // --- 狀態初始化 ---
  const [buyerForm, setBuyerForm] = useState<BuyerState>({
    countryCode: 'JP', itemPrice: 0, isTaxIncluded: true, deduction: 0, 
    shippingCost: 0, otherCost: 0, serviceFeeType: 'percent', serviceFee: 10, 
    fxRateMode: 'auto', manualFxRate: 0,
  });

  const [shopperForm, setShopperForm] = useState<ShopperState>({
    countryCode: 'JP', sellingPriceTWD: 0, actualCost: 0, shippingCost: 0, 
    otherCost: 0, timeSpent: 0, fxRateMode: 'auto', manualFxRate: 0,
  });

  // --- 取得當前國家資訊 (包含即時匯率) ---
  const currentCountry = useMemo(() => {
    const code = activeTab === 'buyer' ? buyerForm.countryCode : shopperForm.countryCode;
    const baseProfile = DEFAULT_COUNTRIES.find(c => c.code === code) || DEFAULT_COUNTRIES[0];
    
    // 如果有抓到即時匯率，就覆蓋 defaultFxRate
    const realTimeRate = exchangeRates[baseProfile.currency];
    
    return {
      ...baseProfile,
      defaultFxRate: realTimeRate || baseProfile.defaultFxRate
    };
  }, [activeTab, buyerForm.countryCode, shopperForm.countryCode, exchangeRates]);

  // --- 處理輸入變更 ---
  const handleBuyerChange = (field: keyof BuyerState, value: any) => {
    setBuyerForm(prev => ({ ...prev, [field]: value }));
  };
  const handleShopperChange = (field: keyof ShopperState, value: any) => {
    setShopperForm(prev => ({ ...prev, [field]: value }));
  };

  // --- 計算結果 ---
  const buyerResult = useMemo(() => calculateBuyerCost(buyerForm, currentCountry.defaultFxRate), [buyerForm, currentCountry]);
  const shopperResult = useMemo(() => calculateShopperProfit(shopperForm, currentCountry.defaultFxRate), [shopperForm, currentCountry]);

  // --- Tooltip Label ---
  const Label = ({ label, tip }: { label: string, tip?: string }) => (
    <div className="flex items-center gap-1 mb-1">
      <label className="text-xs font-bold text-gray-500 uppercase">{label}</label>
      {tip && <span className="text-gray-300 cursor-help" title={tip}>ⓘ</span>}
    </div>
  );

  return (
    <div className="w-full max-w-4xl mx-auto bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden font-sans">
      
      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        <button onClick={() => setActiveTab('buyer')} className={`flex-1 py-4 text-center font-bold transition-all ${activeTab === 'buyer' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}>
          🛍️ 買家試算
        </button>
        <button onClick={() => setActiveTab('shopper')} className={`flex-1 py-4 text-center font-bold transition-all ${activeTab === 'shopper' ? 'bg-orange-50 text-orange-600 border-b-2 border-orange-600' : 'text-gray-500 hover:bg-gray-50'}`}>
          ✈️ 代購試算
        </button>
      </div>

      <div className="p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* 左側表單 */}
        <div className="lg:col-span-7 space-y-6">
          {/* 國家選擇 */}
          <div>
            <Label label="選擇國家 / 匯率" />
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {DEFAULT_COUNTRIES.map((c) => (
                <button
                  key={c.code}
                  onClick={() => activeTab === 'buyer' ? handleBuyerChange('countryCode', c.code) : handleShopperChange('countryCode', c.code)}
                  className={`py-2 px-1 rounded-lg border text-xs font-bold transition-all ${
                    (activeTab === 'buyer' ? buyerForm.countryCode : shopperForm.countryCode) === c.code
                      ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
            <p className="text-right text-[10px] text-gray-400 mt-1">
              目前匯率: 1 {currentCountry.currency} ≈ {currentCountry.defaultFxRate.toFixed(3)} TWD {loadingRates && '(更新中...)'}
            </p>
          </div>

          {/* Tab 1: 買家表單 */}
          {activeTab === 'buyer' && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label label={`商品價格 (${currentCountry.currency})`} />
                  <input type="number" min="0" value={buyerForm.itemPrice || ''} onChange={(e) => handleBuyerChange('itemPrice', parseFloat(e.target.value))} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="0" />
                </div>
                <div>
                  <Label label="折扣 / 退稅" tip="請輸入扣除金額" />
                  <input type="number" min="0" value={buyerForm.deduction || ''} onChange={(e) => handleBuyerChange('deduction', parseFloat(e.target.value))} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="0" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label label="國際運費 (原幣)" />
                  <input type="number" min="0" value={buyerForm.shippingCost || ''} onChange={(e) => handleBuyerChange('shippingCost', parseFloat(e.target.value))} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="0" />
                </div>
                <div>
                  <Label label="代購費" />
                  <div className="flex">
                    <select value={buyerForm.serviceFeeType} onChange={(e) => handleBuyerChange('serviceFeeType', e.target.value)} className="bg-gray-100 border border-r-0 border-gray-200 rounded-l-xl px-2 text-sm outline-none">
                      <option value="percent">%</option>
                      <option value="fixed">$</option>
                    </select>
                    <input type="number" min="0" value={buyerForm.serviceFee} onChange={(e) => handleBuyerChange('serviceFee', parseFloat(e.target.value))} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-r-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                </div>
              </div>
              <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 flex justify-between items-center">
                <span className="text-xs text-blue-700 font-bold">匯率設定</span>
                <div className="flex gap-2">
                  <button onClick={() => handleBuyerChange('fxRateMode', 'auto')} className={`px-2 py-1 rounded text-xs ${buyerForm.fxRateMode === 'auto' ? 'bg-blue-500 text-white' : 'text-gray-500'}`}>自動</button>
                  <button onClick={() => handleBuyerChange('fxRateMode', 'manual')} className={`px-2 py-1 rounded text-xs ${buyerForm.fxRateMode === 'manual' ? 'bg-blue-500 text-white' : 'text-gray-500'}`}>手動</button>
                </div>
              </div>
              {buyerForm.fxRateMode === 'manual' && <input type="number" value={buyerForm.manualFxRate || ''} onChange={(e) => handleBuyerChange('manualFxRate', parseFloat(e.target.value))} className="w-full p-2 border border-gray-300 rounded-lg text-sm" placeholder="輸入自訂匯率" />}
            </div>
          )}

          {/* Tab 2: 留學生表單 */}
          {activeTab === 'shopper' && (
             <div className="space-y-4 animate-fade-in">
               <div>
                 <Label label="預計售價 (TWD)" tip="你想賣多少錢？" />
                 <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                    <input type="number" min="0" value={shopperForm.sellingPriceTWD || ''} onChange={(e) => handleShopperChange('sellingPriceTWD', parseFloat(e.target.value))} className="w-full pl-8 p-3 bg-orange-50 border border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none font-bold text-orange-800" placeholder="0" />
                 </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <Label label="實際成本 (原幣)" />
                   <input type="number" min="0" value={shopperForm.actualCost || ''} onChange={(e) => handleShopperChange('actualCost', parseFloat(e.target.value))} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none" placeholder="0" />
                 </div>
                 <div>
                   <Label label="運費成本 (原幣)" />
                   <input type="number" min="0" value={shopperForm.shippingCost || ''} onChange={(e) => handleShopperChange('shippingCost', parseFloat(e.target.value))} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none" placeholder="0" />
                 </div>
               </div>
               <div>
                  <Label label="花費時間 (小時)" />
                  <input type="number" min="0" value={shopperForm.timeSpent || ''} onChange={(e) => handleShopperChange('timeSpent', parseFloat(e.target.value))} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none" placeholder="1" />
               </div>
             </div>
          )}
        </div>

        {/* 右側：結果卡片 */}
        <div className="lg:col-span-5">
          <div className={`sticky top-8 rounded-2xl shadow-lg p-6 border-2 transition-all duration-500 ${activeTab === 'buyer' ? 'bg-gradient-to-br from-blue-600 to-blue-800 border-blue-500 text-white' : 'bg-gradient-to-br from-orange-500 to-red-500 border-orange-400 text-white'}`}>
            <h3 className="text-lg font-bold opacity-90 mb-6">{activeTab === 'buyer' ? '🧾 費用總覽' : '💰 獲利分析'}</h3>
            
            {activeTab === 'buyer' ? (
              <>
                <div className="space-y-2 mb-6 text-sm opacity-90">
                  <div className="flex justify-between"><span>商品折合</span><span>$ {buyerResult.itemCostTWD.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>運費+雜支</span><span>+ $ {(buyerResult.shippingTWD + buyerResult.otherTWD).toLocaleString()}</span></div>
                  <div className="flex justify-between font-bold bg-white/20 p-1 rounded px-2"><span>代購費</span><span>+ $ {buyerResult.serviceFeeTWD.toLocaleString()}</span></div>
                </div>
                <div className="border-t border-white/20 pt-4">
                  <p className="text-sm opacity-70">預估總價</p>
                  <p className="text-4xl font-black">NT$ {buyerResult.totalTWD.toLocaleString()}</p>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2 mb-6 text-sm opacity-90">
                  <div className="flex justify-between"><span>預計收入</span><span>$ {shopperForm.sellingPriceTWD.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>總成本</span><span className="text-red-100">- $ {shopperResult.totalCostTWD.toLocaleString()}</span></div>
                  
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <div className="bg-white/10 p-2 rounded text-center">
                      <p className="text-xs opacity-70">利潤率</p>
                      <p className="font-bold text-lg">{shopperResult.profitMargin.toFixed(1)}%</p>
                    </div>
                    <div className="bg-white/10 p-2 rounded text-center">
                      <p className="text-xs opacity-70">時薪</p>
                      <p className="font-bold text-lg">${Math.round(shopperResult.hourlyRate)}</p>
                    </div>
                  </div>
                </div>
                <div className="border-t border-white/20 pt-4">
                  <p className="text-sm opacity-70">預估淨利</p>
                  <p className="text-4xl font-black">NT$ {shopperResult.netProfit.toLocaleString()}</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}