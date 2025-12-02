// src/utils/calc.ts
import { BuyerState, ShopperState, BuyerResult, ShopperResult } from '@/types/calculator';

// 取得最終使用的匯率
export const getEffectiveRate = (
  mode: 'auto' | 'manual',
  autoRate: number,
  manualRate: number
): number => {
  // 如果手動匯率是 0 或空，就強制用自動匯率，避免算出來是 0
  if (mode === 'manual' && manualRate > 0) {
    return manualRate;
  }
  return autoRate;
};

/**
 * 買家視角計算
 */
export const calculateBuyerCost = (
  state: BuyerState,
  currentAutoRate: number
): BuyerResult => {
  const rate = getEffectiveRate(state.fxRateMode, currentAutoRate, state.manualFxRate);
  
  // 1. 商品淨額 (原幣)
  const netItemPrice = Math.max(0, state.itemPrice - state.deduction);
  
  // 2. 換算 TWD
  const itemCostTWD = Math.round(netItemPrice * rate);
  const shippingTWD = Math.round(state.shippingCost * rate);
  const otherTWD = Math.round(state.otherCost * rate);

  // 3. 代購費計算
  let serviceFeeTWD = 0;
  if (state.serviceFeeType === 'fixed') {
    serviceFeeTWD = state.serviceFee; 
  } else {
    serviceFeeTWD = Math.round(itemCostTWD * (state.serviceFee / 100));
  }

  const totalTWD = itemCostTWD + shippingTWD + otherTWD + serviceFeeTWD;

  return {
    totalTWD,
    itemCostTWD,
    shippingTWD,
    otherTWD,
    serviceFeeTWD,
  };
};

/**
 * 留學生視角計算
 */
export const calculateShopperProfit = (
  state: ShopperState,
  currentAutoRate: number
): ShopperResult => {
  const rate = getEffectiveRate(state.fxRateMode, currentAutoRate, state.manualFxRate);

  // 總成本 (TWD)
  const totalCostNative = state.actualCost + state.shippingCost + state.otherCost;
  const totalCostTWD = Math.round(totalCostNative * rate);

  // 淨利
  const netProfit = state.sellingPriceTWD - totalCostTWD;

  // 利潤率
  const profitMargin = state.sellingPriceTWD > 0 
    ? (netProfit / state.sellingPriceTWD) * 100 
    : 0;

  // 時薪
  const hourlyRate = state.timeSpent > 0 
    ? netProfit / state.timeSpent 
    : 0;

  return {
    netProfit,
    profitMargin,
    hourlyRate,
    totalCostTWD,
  };
};