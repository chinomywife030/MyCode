import { supabase } from './supabase';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, any>;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

/**
 * 獲取當前用戶的通知列表
 */
export async function getNotifications(): Promise<Notification[]> {
  try {
    // 先檢查認證狀態
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error('[getNotifications] Session error:', sessionError);
      throw new Error(`認證錯誤：${sessionError.message}`);
    }

    if (!session || !session.user) {
      console.log('[getNotifications] No session, returning empty array');
      return [];
    }

    const userId = session.user.id;
    console.log('[getNotifications] Fetching notifications for user:', userId);

    // 優先嘗試使用 RPC 函數（如果存在），它可以繞過 RLS 限制
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_notifications', {
        p_limit: 100,
        p_before: null,
      });

      if (!rpcError && rpcData) {
        console.log('[getNotifications] Successfully fetched via RPC:', rpcData.length, 'notifications');
        return (rpcData || []).map((item: any) => ({
          id: item.id,
          user_id: item.user_id,
          type: item.type,
          title: item.title,
          body: item.body,
          data: item.data || {},
          is_read: item.is_read ?? (item.read_at !== null),
          read_at: item.read_at,
          created_at: item.created_at,
        }));
      }

      // 如果 RPC 不存在或失敗，fallback 到直接查詢
      console.log('[getNotifications] RPC not available, falling back to direct query');
    } catch (rpcErr: any) {
      // RPC 函數可能不存在，繼續使用直接查詢
      console.log('[getNotifications] RPC error (may not exist):', rpcErr.message);
    }

    // Fallback: 直接查詢表（需要 RLS 政策正確設置）
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('[getNotifications] Supabase error:', error);
      // 如果是權限錯誤，提供更清楚的訊息和解決方案
      if (error.message?.includes('permission denied') || error.code === '42501') {
        throw new Error(
          '權限不足：請確認已登入且 RLS 政策已正確設置。\n' +
          '解決方案：在 Supabase Dashboard 執行 FIX_NOTIFICATIONS_RLS.sql 腳本'
        );
      }
      throw new Error(`載入通知失敗：${error.message}`);
    }

    console.log('[getNotifications] Successfully fetched', data?.length || 0, 'notifications');

    return (data || []).map((item) => ({
      id: item.id,
      user_id: item.user_id,
      type: item.type,
      title: item.title,
      body: item.body,
      data: item.data || {},
      is_read: item.is_read || false,
      read_at: item.read_at,
      created_at: item.created_at,
    }));
  } catch (error: any) {
    console.error('[getNotifications] Exception:', error);
    throw new Error(error.message || '載入通知失敗');
  }
}

/**
 * 標記通知為已讀
 */
export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('請先登入');
    }

    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', notificationId)
      .eq('user_id', user.id);

    if (error) {
      console.error('[markNotificationAsRead] Error:', error);
      throw new Error(`標記已讀失敗：${error.message}`);
    }

    return true;
  } catch (error: any) {
    console.error('[markNotificationAsRead] Exception:', error);
    throw new Error(error.message || '標記已讀失敗');
  }
}

/**
 * 標記所有通知為已讀
 */
export async function markAllNotificationsAsRead(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('請先登入');
    }

    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (error) {
      console.error('[markAllNotificationsAsRead] Error:', error);
      throw new Error(`標記全部已讀失敗：${error.message}`);
    }

    return true;
  } catch (error: any) {
    console.error('[markAllNotificationsAsRead] Exception:', error);
    throw new Error(error.message || '標記全部已讀失敗');
  }
}

/**
 * 獲取未讀通知數量
 */
export async function getUnreadCount(): Promise<number> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return 0;
    }

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (error) {
      console.error('[getUnreadCount] Error:', error);
      return 0;
    }

    return count || 0;
  } catch (error: any) {
    console.error('[getUnreadCount] Exception:', error);
    return 0;
  }
}

