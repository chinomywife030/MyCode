/**
 * ✨ Recommendations Cron Route
 * 
 * GET /api/cron/recommendations
 * 
 * 單獨執行 recommendations 任務。
 * 注意：此 route 現在由 /api/cron/master 統一排程，
 * 但仍保留供手動觸發使用。
 */

import { NextRequest, NextResponse } from 'next/server';
import { runRecommendations } from '@/lib/cronTasks';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  console.log('[Cron] recommendations triggered');
  
  // 驗證 cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const result = await runRecommendations();
  
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    ...result,
  }, { status: result.success ? 200 : 500 });
}

export async function POST(request: NextRequest) {
  return GET(request);
}
