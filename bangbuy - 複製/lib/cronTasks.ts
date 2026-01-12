/**
 * 🔧 Cron 任務邏輯模組
 * 
 * 將各個 cron 任務的核心邏輯抽成可重用的函式，
 * 供 master cron route 或個別 route 呼叫。
 */

import { processUnreadReminders } from '@/lib/messageNotifications';

// ============================================
// Email Worker Task
// ============================================

export interface TaskResult {
  success: boolean;
  task: string;
  message?: string;
  error?: string;
  data?: any;
}

/**
 * 執行 email-worker：呼叫 Supabase Edge Function 發送 pending emails
 */
export async function runEmailWorker(): Promise<TaskResult> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return {
      success: false,
      task: 'email-worker',
      error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY',
    };
  }

  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/email-worker`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        task: 'email-worker',
        error: `HTTP ${response.status}: ${errorText}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      task: 'email-worker',
      message: 'Email worker executed successfully',
      data,
    };
  } catch (error: any) {
    return {
      success: false,
      task: 'email-worker',
      error: error.message || 'Unknown error',
    };
  }
}

// ============================================
// Unread Reminders Task
// ============================================

/**
 * 執行 unread-reminders：處理未讀訊息提醒
 */
export async function runUnreadReminders(): Promise<TaskResult> {
  try {
    const result = await processUnreadReminders();
    return {
      success: true,
      task: 'unread-reminders',
      message: `Processed: ${result.processed}, Sent: ${result.sent}, Errors: ${result.errors}`,
      data: result,
    };
  } catch (error: any) {
    return {
      success: false,
      task: 'unread-reminders',
      error: error.message || 'Unknown error',
    };
  }
}

// ============================================
// Recommendations Task
// ============================================

/**
 * 執行 recommendations：呼叫 Supabase Edge Function 產生推薦 digest
 */
export async function runRecommendations(): Promise<TaskResult> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return {
      success: false,
      task: 'recommendations',
      error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY',
    };
  }

  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/generate-recommendations`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        task: 'recommendations',
        error: `HTTP ${response.status}: ${errorText}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      task: 'recommendations',
      message: 'Recommendations generated successfully',
      data,
    };
  } catch (error: any) {
    return {
      success: false,
      task: 'recommendations',
      error: error.message || 'Unknown error',
    };
  }
}

// ============================================
// Run All Tasks
// ============================================

/**
 * 執行所有 cron 任務
 */
export async function runAllCronTasks(): Promise<{
  timestamp: string;
  results: TaskResult[];
  summary: {
    total: number;
    success: number;
    failed: number;
  };
}> {
  console.log('[Cron Master] Starting all tasks...');
  
  const results: TaskResult[] = [];
  
  // 1. Email Worker（每次都執行）
  console.log('[Cron Master] Running email-worker...');
  const emailResult = await runEmailWorker();
  results.push(emailResult);
  console.log(`[Cron Master] email-worker: ${emailResult.success ? 'OK' : 'FAILED'}`);
  
  // 2. Unread Reminders（每次都執行）
  console.log('[Cron Master] Running unread-reminders...');
  const unreadResult = await runUnreadReminders();
  results.push(unreadResult);
  console.log(`[Cron Master] unread-reminders: ${unreadResult.success ? 'OK' : 'FAILED'}`);
  
  // 3. Recommendations（每日一次，檢查是否該執行）
  // 這裡簡化處理：每次都嘗試呼叫，由 Supabase function 內部判斷是否需要產生
  console.log('[Cron Master] Running recommendations...');
  const recoResult = await runRecommendations();
  results.push(recoResult);
  console.log(`[Cron Master] recommendations: ${recoResult.success ? 'OK' : 'FAILED'}`);
  
  const summary = {
    total: results.length,
    success: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
  };
  
  console.log(`[Cron Master] Completed: ${summary.success}/${summary.total} tasks succeeded`);
  
  return {
    timestamp: new Date().toISOString(),
    results,
    summary,
  };
}










