/**
 * 國家旗幟顯示 Helper
 * 統一處理所有國旗 emoji 的生成邏輯
 */

/**
 * 將國家代碼轉換為旗幟 emoji
 * @param countryCode - 國家代碼（例如 'JP', 'US', 'UK', 'GB'）
 * @returns 旗幟 emoji 或 null（如果無法生成）
 */
export function getCountryFlag(countryCode: string | null | undefined): string | null {
  if (!countryCode || typeof countryCode !== 'string') {
    return null;
  }

  // Normalize: UK -> GB
  const normalizedCode = countryCode.toUpperCase().trim();
  const code = normalizedCode === 'UK' ? 'GB' : normalizedCode;

  // 驗證是否為有效的 ISO alpha-2 代碼（兩碼英文字母）
  if (!/^[A-Z]{2}$/.test(code)) {
    return null;
  }

  // 將字母轉換為 regional indicator symbols（旗幟 emoji）
  // 每個字母對應一個 regional indicator symbol（U+1F1E6 到 U+1F1FF）
  const codePoints = code
    .split('')
    .map((char) => 0x1f1e6 + (char.charCodeAt(0) - 0x41)); // A=0x41, 0x1F1E6 是 🇦

  // 組合為旗幟 emoji
  const flag = String.fromCodePoint(...codePoints);

  return flag;
}

/**
 * 獲取國家旗幟，如果無法生成則返回 fallback
 * @param countryCode - 國家代碼
 * @param fallback - 無法生成時的 fallback（預設為 🌍）
 * @returns 旗幟 emoji 或 fallback
 */
export function getCountryFlagWithFallback(
  countryCode: string | null | undefined,
  fallback: string = '🌍'
): string {
  return getCountryFlag(countryCode) || fallback;
}




