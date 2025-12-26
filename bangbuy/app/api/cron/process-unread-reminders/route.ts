/**
 * 🔔 未讀提醒 Cron Route
 * 
 * GET /api/cron/process-unread-reminders
 * 
 * 單獨執行 unread-reminders 任務。
 * 注意：此 route 現在由 /api/cron/master 統一排程，
 * 但仍保留供手動觸發使用。
 */

import { NextRequest, NextResponse } from 'next/server';
import { runUnreadReminders } from '@/lib/cronTasks';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  console.log('[Cron] process-unread-reminders triggered');
  
  // 驗證 cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const result = await runUnreadReminders();
  
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    ...result,
  }, { status: result.success ? 200 : 500 });
}

export async function POST(request: NextRequest) {
  return GET(request);
}
