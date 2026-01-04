import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * GET /api/push/health
 * 健康檢查 endpoint（純驗證部署，不碰推播）
 */
export async function GET() {
  console.log('[push/health] ok');
  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
  });
}

