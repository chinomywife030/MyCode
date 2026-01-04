/**
 * 格式化日期區間顯示
 * @param startDate 開始日期 (YYYY-MM-DD 或 Date 物件)
 * @param endDate 結束日期 (YYYY-MM-DD 或 Date 物件)
 * @param fallbackDate 向下相容：舊的單一日期欄位 (可選)
 * @returns 格式化後的日期字串
 */
export function formatDateRange(
  startDate?: string | Date | null,
  endDate?: string | Date | null,
  fallbackDate?: string | Date | null
): string {
  // 向下相容：如果沒有 start_date/end_date，使用舊的 date 欄位
  let start: Date | null = null;
  let end: Date | null = null;

  if (startDate && endDate) {
    start = typeof startDate === 'string' ? new Date(startDate) : startDate;
    end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  } else if (fallbackDate) {
    // 舊資料：使用 date 欄位作為 start 和 end
    const fallback = typeof fallbackDate === 'string' ? new Date(fallbackDate) : fallbackDate;
    start = fallback;
    end = fallback;
  } else {
    return '日期未定';
  }

  if (!start || !end) {
    return '日期未定';
  }

  // 格式化為 YYYY/MM/DD
  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  };

  const startStr = formatDate(start);
  const endStr = formatDate(end);

  // 如果開始日期等於結束日期，只顯示單一日期
  if (startStr === endStr) {
    return startStr;
  }

  // 否則顯示區間
  return `${startStr} - ${endStr}`;
}

/**
 * 檢查日期是否在區間內（用於篩選）
 */
export function isDateInRange(
  checkDate: string | Date,
  startDate?: string | Date | null,
  endDate?: string | Date | null,
  fallbackDate?: string | Date | null
): boolean {
  const check = typeof checkDate === 'string' ? new Date(checkDate) : checkDate;
  
  let start: Date | null = null;
  let end: Date | null = null;

  if (startDate && endDate) {
    start = typeof startDate === 'string' ? new Date(startDate) : startDate;
    end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  } else if (fallbackDate) {
    const fallback = typeof fallbackDate === 'string' ? new Date(fallbackDate) : fallbackDate;
    start = fallback;
    end = fallback;
  } else {
    return false;
  }

  if (!start || !end) return false;

  // 檢查日期是否在區間內（包含邊界）
  return check >= start && check <= end;
}















