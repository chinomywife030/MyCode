/**
 * 📊 結構化 Logger
 * 
 * 提供關鍵流程的結構化日誌，方便上線後快速定位問題。
 * 
 * 功能：
 * - 生成 request_id 串起前後端
 * - 結構化 JSON 格式（可被 Vercel Logs / Datadog / Sentry 搜尋）
 * - 敏感資訊遮罩
 */

// ========== Types ==========

export interface LogContext {
  /** 請求追蹤 ID */
  requestId?: string;
  /** 使用者 ID（可選，會被 hash）*/
  userId?: string;
  /** 目標使用者 ID */
  targetUserId?: string;
  /** 額外資訊 */
  [key: string]: any;
}

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

// ========== Request ID ==========

/**
 * 生成唯一的 Request ID
 * 格式：時間戳-隨機碼（簡短易讀）
 */
export function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`.toUpperCase();
}

// ========== Masking ==========

/**
 * 遮罩 Email（只保留 domain）
 * example@gmail.com → ***@gmail.com
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '***';
  const [, domain] = email.split('@');
  return `***@${domain}`;
}

/**
 * 遮罩 User ID（只保留前後各 4 碼）
 * 12345678-1234-1234-1234-123456789012 → 1234...9012
 */
export function maskUserId(userId: string): string {
  if (!userId || userId.length < 12) return '***';
  return `${userId.substring(0, 4)}...${userId.substring(userId.length - 4)}`;
}

/**
 * 遮罩 URL 的敏感參數
 */
export function maskUrl(url: string): string {
  if (!url) return '';
  try {
    const parsed = new URL(url, 'https://example.com');
    // 遮罩敏感參數
    ['token', 'code', 'access_token', 'refresh_token'].forEach(param => {
      if (parsed.searchParams.has(param)) {
        parsed.searchParams.set(param, '***');
      }
    });
    return parsed.pathname + parsed.search;
  } catch {
    return url.replace(/token=[^&]+/g, 'token=***');
  }
}

// ========== Logger ==========

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  event: string;
  requestId: string;
  environment: string;
  [key: string]: any;
}

/**
 * 結構化日誌輸出
 */
function log(level: LogLevel, event: string, context: LogContext = {}): void {
  const { requestId = generateRequestId(), userId, targetUserId, ...rest } = context;
  
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    requestId,
    environment: process.env.NODE_ENV || 'development',
  };
  
  // 遮罩敏感資訊
  if (userId) {
    entry.userId = maskUserId(userId);
  }
  if (targetUserId) {
    entry.targetUserId = maskUserId(targetUserId);
  }
  
  // 加入其他 context
  Object.keys(rest).forEach(key => {
    const value = rest[key];
    // 自動遮罩 email
    if (key.toLowerCase().includes('email') && typeof value === 'string') {
      entry[key] = maskEmail(value);
    } else if (key.toLowerCase().includes('token') && typeof value === 'string') {
      entry[key] = '***';
    } else {
      entry[key] = value;
    }
  });
  
  // 輸出
  const output = JSON.stringify(entry);
  
  switch (level) {
    case 'error':
      console.error(output);
      break;
    case 'warn':
      console.warn(output);
      break;
    case 'debug':
      if (process.env.NODE_ENV === 'development') {
        console.debug(output);
      }
      break;
    default:
      console.log(output);
  }
}

// ========== Public API ==========

export const logger = {
  info: (event: string, context?: LogContext) => log('info', event, context),
  warn: (event: string, context?: LogContext) => log('warn', event, context),
  error: (event: string, context?: LogContext) => log('error', event, context),
  debug: (event: string, context?: LogContext) => log('debug', event, context),
};

// ========== 特定流程 Logger ==========

/**
 * Email 發送日誌
 */
export function logEmailSend(params: {
  requestId?: string;
  to: string;
  template: string;
  result: 'success' | 'fail';
  errorCode?: string;
  errorMessage?: string;
  providerId?: string;
}) {
  const { requestId = generateRequestId(), to, template, result, errorCode, errorMessage, providerId } = params;
  
  const context: LogContext = {
    requestId,
    to: maskEmail(to),
    template,
    result,
  };
  
  if (result === 'success' && providerId) {
    context.providerId = providerId;
  }
  
  if (result === 'fail') {
    context.errorCode = errorCode || 'UNKNOWN';
    context.errorMessage = errorMessage || 'Unknown error';
  }
  
  if (result === 'fail') {
    logger.error('email_send', context);
  } else {
    logger.info('email_send', context);
  }
  
  return requestId;
}

/**
 * 聊天建立/發送日誌
 */
export function logChatAction(params: {
  requestId?: string;
  action: 'create_conversation' | 'send_message';
  userId: string;
  targetUserId?: string;
  conversationId?: string;
  result: 'success' | 'fail';
  errorCode?: string;
  errorMessage?: string;
}) {
  const { requestId = generateRequestId(), action, userId, targetUserId, conversationId, result, errorCode, errorMessage } = params;
  
  const context: LogContext = {
    requestId,
    action,
    userId,
    targetUserId,
    conversationId,
    result,
  };
  
  if (result === 'fail') {
    context.errorCode = errorCode || 'UNKNOWN';
    context.errorMessage = errorMessage || 'Unknown error';
    logger.error('chat_action', context);
  } else {
    logger.info('chat_action', context);
  }
  
  return requestId;
}

/**
 * Auth 回跳日誌
 */
export function logAuthCallback(params: {
  requestId?: string;
  returnTo?: string;
  type?: string;
  result: 'success' | 'fail';
  errorCode?: string;
  errorMessage?: string;
}) {
  const { requestId = generateRequestId(), returnTo, type, result, errorCode, errorMessage } = params;
  
  const context: LogContext = {
    requestId,
    returnTo: returnTo ? maskUrl(returnTo) : undefined,
    type,
    result,
  };
  
  if (result === 'fail') {
    context.errorCode = errorCode || 'UNKNOWN';
    context.errorMessage = errorMessage || 'Unknown error';
    logger.error('auth_callback', context);
  } else {
    logger.info('auth_callback', context);
  }
  
  return requestId;
}

export default logger;
















