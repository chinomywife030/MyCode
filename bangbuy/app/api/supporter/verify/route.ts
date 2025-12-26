import { NextRequest, NextResponse } from 'next/server';

/**
 * Supporter 驗證 API
 * 🚫 暫時停用（Supporter 功能下線）
 */

export async function POST(request: NextRequest) {
  // Supporter 功能暫時下線，返回 404
  return NextResponse.json(
    { error: 'Supporter 功能暫時停用' },
    { status: 404 }
  );
}

export async function GET(request: NextRequest) {
  // Supporter 功能暫時下線，返回 404
  return NextResponse.json(
    { error: 'Supporter 功能暫時停用' },
    { status: 404 }
  );
}
