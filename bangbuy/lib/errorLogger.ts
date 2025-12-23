/**
 * 🔍 錯誤事件記錄系統
 * 
 * 目的：
 * 1. 記錄所有錯誤事件
 * 2. 不影響使用者操作
 * 3. 記錄失敗時不引發新錯誤
 * 4. 提供可追蹤的錯誤歷史
 */

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface ErrorContext {
  page?: string;
  component?: string;
  action?: string;
  operation?: string;
  userId?: string;
  severity?: ErrorSeverity;
  metadata?: Record<string, any>;
}

export interface ErrorLog {
  id: string;
  timestamp: string;
  message: string;
  stack?: string;
  context: ErrorContext;
  userAgent: string;
  url: string;
}

// 內存中的錯誤日誌（最多保留 100 條）
let errorLogs: ErrorLog[] = [];
const MAX_LOGS = 100;

/**
 * 記錄錯誤事件
 */
export function logError(error: Error | any, context?: ErrorContext): void {
  try {
    const errorLog: ErrorLog = {
      id: `err-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      message: error?.message || String(error),
      stack: error?.stack,
      context: {
        severity: 'error',
        ...context,
      },
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
      url: typeof window !== 'undefined' ? window.location.href : 'server',
    };

    // 添加到內存日誌
    errorLogs.unshift(errorLog);
    if (errorLogs.length > MAX_LOGS) {
      errorLogs = errorLogs.slice(0, MAX_LOGS);
    }

    // 根據嚴重程度決定 console 輸出
    const severity = context?.severity || 'error';
    const prefix = `[ErrorLogger]`;
    
    switch (severity) {
      case 'critical':
        console.error(`${prefix} 🚨 CRITICAL:`, errorLog.message, errorLog);
        break;
      case 'error':
        console.error(`${prefix} ❌:`, errorLog.message, errorLog);
        break;
      case 'warning':
        console.warn(`${prefix} ⚠️:`, errorLog.message, errorLog);
        break;
      case 'info':
        console.info(`${prefix} ℹ️:`, errorLog.message, errorLog);
        break;
    }

    // 如果是 critical 錯誤，嘗試發送到後端（可選）
    if (severity === 'critical') {
      sendErrorToBackend(errorLog);
    }
  } catch (err) {
    // 記錄失敗不應該影響程式執行
    console.error('[ErrorLogger] 記錄錯誤時發生異常:', err);
  }
}

/**
 * 獲取所有錯誤日誌
 */
export function getErrorLogs(): ErrorLog[] {
  return [...errorLogs];
}

/**
 * 清除錯誤日誌
 */
export function clearErrorLogs(): void {
  errorLogs = [];
}

/**
 * 獲取特定頁面的錯誤
 */
export function getErrorsByPage(page: string): ErrorLog[] {
  return errorLogs.filter(log => log.context.page === page);
}

/**
 * 獲取特定嚴重程度的錯誤
 */
export function getErrorsBySeverity(severity: ErrorSeverity): ErrorLog[] {
  return errorLogs.filter(log => log.context.severity === severity);
}

/**
 * 發送錯誤到後端（可選實現）
 */
async function sendErrorToBackend(errorLog: ErrorLog): Promise<void> {
  try {
    // 這裡可以實現發送到後端的邏輯
    // 例如：fetch('/api/errors', { method: 'POST', body: JSON.stringify(errorLog) })
    
    // 目前只在本地記錄
    console.log('[ErrorLogger] Critical error logged:', errorLog.id);
  } catch (err) {
    // 靜默失敗
  }
}

/**
 * 工具函數：包裝 async 函數並自動捕捉錯誤
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context?: ErrorContext
): T {
  return (async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      logError(error, context);
      throw error; // 重新拋出，讓調用方決定如何處理
    }
  }) as T;
}












