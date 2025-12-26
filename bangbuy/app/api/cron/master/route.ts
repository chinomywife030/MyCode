/**
 * 🎯 Master Cron Route
 * 
 * GET /api/cron/master
 * 
 * 統一執行所有 cron 任務的單一進入點。
 * 用於 Vercel Hobby 計劃只能設定 1-2 個 cron job 的限制。
 * 
 * 執行的任務：
 * 1. email-worker - 發送 pending emails
 * 2. unread-reminders - 處理未讀訊息提醒
 * 3. recommendations - 產生推薦 digest（內部判斷是否該執行）
 */

import { NextRequest, NextResponse } from 'next/server';
import { runAllCronTasks } from '@/lib/cronTasks';

export const runtime = 'nodejs';
export const maxDuration = 60; // 最長執行 60 秒

export async function GET(request: NextRequest) {
  console.log('[Cron Master] Request received');
  
  // 驗證 cron secret（Vercel Cron 會自動帶上 CRON_SECRET）
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  // 如果設定了 CRON_SECRET，需要驗證
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.warn('[Cron Master] Unauthorized request');
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  try {
    const result = await runAllCronTasks();
    
    // 如果有任何任務失敗，返回 207 Multi-Status
    const status = result.summary.failed > 0 ? 207 : 200;
    
    return NextResponse.json(result, { status });
    
  } catch (error: any) {
    console.error('[Cron Master] Fatal error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Internal server error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// 也支援 POST（用於手動觸發測試）
export async function POST(request: NextRequest) {
  return GET(request);
}

