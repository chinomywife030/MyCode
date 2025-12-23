/**
 * 🔔 用戶通知設定 API
 * 
 * GET /api/user/notification-settings - 取得當前用戶的通知設定
 * PUT /api/user/notification-settings - 更新通知設定
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase Admin Client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 從 cookie 提取並驗證 session
async function getSessionUser(request: NextRequest): Promise<{ id: string; email?: string } | null> {
  try {
    const cookies = request.cookies;
    
    // Supabase auth token 通常存在這些 cookie 中
    const accessToken = cookies.get('sb-iaizclcplchjhbfafkiy-auth-token')?.value ||
                        cookies.get('supabase-auth-token')?.value;
    
    if (!accessToken) {
      // 嘗試從 Authorization header 取得
      const authHeader = request.headers.get('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
        if (error || !user) return null;
        return { id: user.id, email: user.email };
      }
      return null;
    }
    
    // 解析 JSON token（Supabase 存的是 JSON 格式）
    let token: string;
    try {
      const parsed = JSON.parse(accessToken);
      token = parsed.access_token || parsed[0]?.access_token || accessToken;
    } catch {
      token = accessToken;
    }
    
    // 用 admin client 驗證 token
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !user) return null;
    
    return { id: user.id, email: user.email };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  console.log('[API] GET /api/user/notification-settings');
  
  try {
    const user = await getSessionUser(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // 取得用戶的通知設定
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select(`
        notify_msg_new_thread_email,
        notify_msg_unread_reminder_email,
        notify_msg_every_message_email,
        notify_msg_unread_hours
      `)
      .eq('id', user.id)
      .single();
    
    if (error) {
      console.error('[API] Error fetching settings:', error);
      return NextResponse.json(
        { error: 'Failed to fetch settings' },
        { status: 500 }
      );
    }
    
    // 返回設定（使用預設值填充）
    return NextResponse.json({
      notify_msg_new_thread_email: profile?.notify_msg_new_thread_email ?? true,
      notify_msg_unread_reminder_email: profile?.notify_msg_unread_reminder_email ?? true,
      notify_msg_every_message_email: profile?.notify_msg_every_message_email ?? false,
      notify_msg_unread_hours: profile?.notify_msg_unread_hours ?? 12,
    });
    
  } catch (error: any) {
    console.error('[API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  console.log('[API] PUT /api/user/notification-settings');
  
  try {
    const user = await getSessionUser(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    
    // 驗證欄位
    const updates: Record<string, any> = {};
    
    if (typeof body.notify_msg_new_thread_email === 'boolean') {
      updates.notify_msg_new_thread_email = body.notify_msg_new_thread_email;
    }
    
    if (typeof body.notify_msg_unread_reminder_email === 'boolean') {
      updates.notify_msg_unread_reminder_email = body.notify_msg_unread_reminder_email;
    }
    
    if (typeof body.notify_msg_every_message_email === 'boolean') {
      updates.notify_msg_every_message_email = body.notify_msg_every_message_email;
    }
    
    if (typeof body.notify_msg_unread_hours === 'number') {
      // 限制範圍：1-72 小時
      updates.notify_msg_unread_hours = Math.max(1, Math.min(72, body.notify_msg_unread_hours));
    }
    
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }
    
    // 更新設定
    const { error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', user.id);
    
    if (error) {
      console.error('[API] Error updating settings:', error);
      return NextResponse.json(
        { error: 'Failed to update settings' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      updated: updates,
    });
    
  } catch (error: any) {
    console.error('[API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
