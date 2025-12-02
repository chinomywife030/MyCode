// src/utils/calculator.ts
import { BuyerState, ShopperState, BuyerResult, ShopperResult, CalculatorSettings } from '@/types/calculator';

// 防呆：確保數值非 NaN 且大於等於 0
const safeNum = (val: any) => {
  const num = parseFloat(val);
  return isNaN(num) || num < 0 ? 0 : num;
};

// 取得有效匯率
export const getEffectiveRate = (settings: CalculatorSettings): number => {
  return settings.fxRateMode === 'manual' && settings.manualFxRate > 0
    ? settings.manualFxRate
    : settings.liveFxRate;
};

// 格式化金額 (TWD)
export const formatCurrency = (amount: number) => 
  new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', maximumFractionDigits: 0 }).format(amount);

/**
 * 🛍️ 買家視角計算
 */
export const calculateBuyer = (state: BuyerState, settings: CalculatorSettings): BuyerResult => {
  const rate = getEffectiveRate(settings);
  
  // 1. 商品總額 (原幣) = (單價 * 數量) - 折扣
  const productTotalRaw = Math.max(0, (safeNum(state.productPrice) * safeNum(state.quantity || 1)) - safeNum(state.discount));
  
  // 2. 轉換台幣
  const productTotalTWD = Math.round(productTotalRaw * rate);
  const shippingTWD = Math.round(safeNum(state.shippingCost) * rate);
  const otherTWD = Math.round(safeNum(state.otherCost) * rate);
  
  // 3. 代購費計算
  let serviceFeeTWD = 0;
  if (state.serviceFeeType === 'fixed') {
    serviceFeeTWD = safeNum(state.serviceFeeValue);
  } else {
    // 百分比通常是基於「商品總額(台幣)」計算
    serviceFeeTWD = Math.round(productTotalTWD * (safeNum(state.serviceFeeValue) / 100));
  }

  const totalTWD = productTotalTWD + shippingTWD + otherTWD + serviceFeeTWD;

  // 產生複製用文字
  const breakdown = `
🧾 代購費用試算
----------------
商品金額：${formatCurrency(productTotalTWD)}
國際運費：${formatCurrency(shippingTWD)}
其他雜支：${formatCurrency(otherTWD)}
代購服務：${formatCurrency(serviceFeeTWD)}
----------------
💰 預估總價：${formatCurrency(totalTWD)}
(匯率: ${rate.toFixed(3)})
`.trim();

  return { totalTWD, productTotalTWD, shippingTWD, otherTWD, serviceFeeTWD, breakdown };
};

/**
 * ✈️ 留學生視角計算
 */
export const calculateShopper = (state: ShopperState, settings: CalculatorSettings): ShopperResult => {
  const rate = getEffectiveRate(settings);

  // 1. 總成本 (TWD)
  const costNative = safeNum(state.productCost) + safeNum(state.shippingCost) + safeNum(state.otherCost);
  const totalCostTWD = Math.round(costNative * rate);
  
  // 2. 收入 (TWD)
  const income = safeNum(state.targetSellingPrice);

  // 3. 淨利
  const netProfit = income - totalCostTWD;

  // 4. 利潤率
  const profitMargin = income > 0 ? (netProfit / income) * 100 : 0;

  // 5. 時薪
  const hourlyWage = safeNum(state.timeSpent) > 0 ? netProfit / safeNum(state.timeSpent) : 0;

  const breakdown = `
✈️ 代購獲利分析
----------------
預計售價：${formatCurrency(income)}
總計成本：-${formatCurrency(totalCostTWD)}
----------------
💰 預估淨利：${formatCurrency(netProfit)}
📈 利潤率：${profitMargin.toFixed(1)}%
(工時: ${state.timeSpent}hr, 時薪: ${formatCurrency(hourlyWage)})
`.trim();

  return { netProfit, profitMargin, hourlyWage, totalCostTWD, breakdown };
};