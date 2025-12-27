/**
 * 🔍 錯誤追蹤與性能監控
 * 
 * 輕量級錯誤追蹤（可替換為 Sentry）
 * 
 * 使用方式：
 * 1. 在 app/layout.tsx 中初始化
 * 2. 使用 captureError 捕捉錯誤
 * 3. 使用 captureMessage 記錄重要事件
 */

interface ErrorContext {
  page?: string;
  action?: string;
  userId?: string;
  extra?: Record<string, any>;
}

interface PerformanceMetric {
  name: string;
  value: number;
  page: string;
  timestamp: number;
}

// ============================================
// 錯誤日誌存儲（本地 fallback）
// ============================================

const MAX_ERRORS = 50;
const errorLog: Array<{
  timestamp: number;
  error: string;
  context: ErrorContext;
}> = [];

const performanceLog: PerformanceMetric[] = [];

// ============================================
// 初始化（在 layout.tsx 調用）
// ============================================

export function initErrorTracking() {
  if (typeof window === 'undefined') return;

  // 全域錯誤捕捉
  window.onerror = (message, source, lineno, colno, error) => {
    captureError(error || new Error(String(message)), {
      page: window.location.pathname,
      extra: { source, lineno, colno },
    });
  };

  // Promise rejection 捕捉
  window.onunhandledrejection = (event) => {
    captureError(event.reason, {
      page: window.location.pathname,
      action: 'unhandled_rejection',
    });
  };

  // Web Vitals 收集（LCP, FID, CLS）
  if ('PerformanceObserver' in window) {
    try {
      // LCP
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        if (lastEntry) {
          capturePerformance('LCP', lastEntry.startTime, window.location.pathname);
        }
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

      // FID
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          capturePerformance('FID', entry.processingStart - entry.startTime, window.location.pathname);
        });
      });
      fidObserver.observe({ type: 'first-input', buffered: true });

      // CLS
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        capturePerformance('CLS', clsValue, window.location.pathname);
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });
    } catch (e) {
      // PerformanceObserver 不支援某些 entry type
    }
  }

  console.log('[ErrorTracking] Initialized');
}

// ============================================
// 錯誤捕捉
// ============================================

export function captureError(error: Error | unknown, context: ErrorContext = {}) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  // 本地日誌
  errorLog.push({
    timestamp: Date.now(),
    error: errorMessage,
    context: {
      ...context,
      extra: {
        ...context.extra,
        stack: errorStack,
      },
    },
  });

  // 限制日誌數量
  if (errorLog.length > MAX_ERRORS) {
    errorLog.shift();
  }

  // 開發環境 console
  if (process.env.NODE_ENV === 'development') {
    console.error('[ErrorTracking] Captured:', errorMessage, context);
  }

  // TODO: 發送到 Sentry 或其他服務
  // if (typeof Sentry !== 'undefined') {
  //   Sentry.captureException(error, { extra: context });
  // }
}

// ============================================
// 訊息記錄
// ============================================

export function captureMessage(message: string, context: ErrorContext = {}) {
  if (process.env.NODE_ENV === 'development') {
    console.log('[ErrorTracking] Message:', message, context);
  }

  // TODO: 發送到 Sentry
  // if (typeof Sentry !== 'undefined') {
  //   Sentry.captureMessage(message, { extra: context });
  // }
}

// ============================================
// 性能指標記錄
// ============================================

export function capturePerformance(name: string, value: number, page: string) {
  performanceLog.push({
    name,
    value,
    page,
    timestamp: Date.now(),
  });

  // 限制數量
  if (performanceLog.length > 100) {
    performanceLog.shift();
  }

  if (process.env.NODE_ENV === 'development') {
    console.log(`[Performance] ${name}: ${value.toFixed(2)}ms (${page})`);
  }
}

// ============================================
// 頁面載入時間測量
// ============================================

export function measurePageLoad(pageName: string) {
  if (typeof window === 'undefined') return;

  const startTime = performance.now();

  return {
    complete: () => {
      const duration = performance.now() - startTime;
      capturePerformance(`${pageName}_load`, duration, pageName);
      return duration;
    },
  };
}

// ============================================
// 獲取錯誤日誌（debug 用）
// ============================================

export function getErrorLog() {
  return [...errorLog];
}

export function getPerformanceLog() {
  return [...performanceLog];
}

// ============================================
// 清除日誌
// ============================================

export function clearLogs() {
  errorLog.length = 0;
  performanceLog.length = 0;
}

