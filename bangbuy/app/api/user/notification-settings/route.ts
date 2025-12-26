/**
 * 🔔 用戶通知設定 API
 * 
 * GET /api/user/notification-settings - 取得當前用戶的通知設定
 * PUT /api/user/notification-settings - 更新通知設定
 * 
 * 支援兩個設定來源：
 * - profiles 表：私訊通知設定（notify_msg_*）
 * - notification_preferences 表：推薦 Email 設定（email_reco_enabled, digest_mode）
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
    
    // 取得用戶的通知設定（從 profiles 表）
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select(`
        notify_msg_new_thread_email,
        notify_msg_unread_reminder_email,
        notify_msg_every_message_email,
        notify_msg_unread_hours
      `)
      .eq('id', user.id)
      .single();
    
    if (profileError && profileError.code !== 'PGRST116') {
      console.error('[API] Error fetching profile settings:', profileError);
    }
    
    // 取得推薦設定（從 notification_preferences 表）
    const { data: prefs, error: prefsError } = await supabaseAdmin
      .from('notification_preferences')
      .select(`
        email_reco_enabled,
        digest_mode
      `)
      .eq('user_id', user.id)
      .single();
    
    if (prefsError && prefsError.code !== 'PGRST116') {
      console.error('[API] Error fetching notification_preferences:', prefsError);
    }
    
    // 返回設定（使用預設值填充）
    return NextResponse.json({
      // 私訊通知設定
      notify_msg_new_thread_email: profile?.notify_msg_new_thread_email ?? true,
      notify_msg_unread_reminder_email: profile?.notify_msg_unread_reminder_email ?? true,
      notify_msg_every_message_email: profile?.notify_msg_every_message_email ?? false,
      notify_msg_unread_hours: profile?.notify_msg_unread_hours ?? 12,
      // 推薦 Email 設定
      email_reco_enabled: prefs?.email_reco_enabled ?? true,
      digest_mode: prefs?.digest_mode ?? 'daily',
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
    
    // 分離兩種設定
    const profileUpdates: Record<string, any> = {};
    const prefsUpdates: Record<string, any> = {};
    
    // ========================================
    // Profile 欄位（私訊通知）
    // ========================================
    if (typeof body.notify_msg_new_thread_email === 'boolean') {
      profileUpdates.notify_msg_new_thread_email = body.notify_msg_new_thread_email;
    }
    
    if (typeof body.notify_msg_unread_reminder_email === 'boolean') {
      profileUpdates.notify_msg_unread_reminder_email = body.notify_msg_unread_reminder_email;
    }
    
    if (typeof body.notify_msg_every_message_email === 'boolean') {
      profileUpdates.notify_msg_every_message_email = body.notify_msg_every_message_email;
    }
    
    if (typeof body.notify_msg_unread_hours === 'number') {
      // 限制範圍：1-72 小時
      profileUpdates.notify_msg_unread_hours = Math.max(1, Math.min(72, body.notify_msg_unread_hours));
    }
    
    // ========================================
    // Notification Preferences 欄位（推薦 Email）
    // ========================================
    if (typeof body.email_reco_enabled === 'boolean') {
      prefsUpdates.email_reco_enabled = body.email_reco_enabled;
    }
    
    if (typeof body.digest_mode === 'string' && ['instant', 'hourly', 'daily'].includes(body.digest_mode)) {
      prefsUpdates.digest_mode = body.digest_mode;
    }
    
    const hasProfileUpdates = Object.keys(profileUpdates).length > 0;
    const hasPrefsUpdates = Object.keys(prefsUpdates).length > 0;
    
    if (!hasProfileUpdates && !hasPrefsUpdates) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }
    
    // 更新 profiles 表
    if (hasProfileUpdates) {
      const { error } = await supabaseAdmin
        .from('profiles')
        .update(profileUpdates)
        .eq('id', user.id);
      
      if (error) {
        console.error('[API] Error updating profile settings:', error);
        return NextResponse.json(
          { error: 'Failed to update profile settings' },
          { status: 500 }
        );
      }
    }
    
    // 更新 notification_preferences 表（upsert）
    if (hasPrefsUpdates) {
      const { error } = await supabaseAdmin
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          ...prefsUpdates,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });
      
      if (error) {
        console.error('[API] Error updating notification_preferences:', error);
        return NextResponse.json(
          { error: 'Failed to update notification preferences' },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json({
      success: true,
      updated: {
        ...profileUpdates,
        ...prefsUpdates,
      },
    });
    
  } catch (error: any) {
    console.error('[API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
