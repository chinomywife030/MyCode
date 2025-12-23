/**
 * 🔔 未讀提醒 Cron Job
 * 
 * GET /api/cron/process-unread-reminders
 * 
 * 由 Vercel Cron 或 Supabase Scheduled Function 呼叫
 * 建議每 15-30 分鐘執行一次
 * 
 * Vercel Cron 設定（vercel.json）：
 * {
 *   "crons": [{
 *     "path": "/api/cron/process-unread-reminders",
 *     "schedule": "0,15,30,45 * * * *"
 *   }]
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { processUnreadReminders } from '@/lib/messageNotifications';

export const runtime = 'nodejs';
export const maxDuration = 60; // 最長執行 60 秒

export async function GET(request: NextRequest) {
  console.log('[Cron] Processing unread reminders...');
  
  // 驗證 cron secret（Vercel Cron 會自動帶上 CRON_SECRET）
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  // 如果設定了 CRON_SECRET，需要驗證
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.warn('[Cron] Unauthorized request');
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  try {
    const result = await processUnreadReminders();
    
    console.log(`[Cron] Completed: processed=${result.processed}, sent=${result.sent}, errors=${result.errors}`);
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
    
  } catch (error: any) {
    console.error('[Cron] Error:', error);
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

