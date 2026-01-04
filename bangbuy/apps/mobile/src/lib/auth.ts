import { router } from 'expo-router';
import { supabase } from './supabase';
import type { Session } from '@supabase/supabase-js';

/**
 * 獲取當前 Session
 */
export async function getSession(): Promise<Session | null> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('[getSession] Error:', error);
      return null;
    }
    
    return session;
  } catch (error: any) {
    // AuthSessionMissingError 是正常情況（未登入），不需要記錄為錯誤
    if (error?.message?.includes('Auth session missing')) {
      return null;
    }
    console.error('[getSession] Exception:', error);
    return null;
  }
}

/**
 * 要求登入：若未登入則導向登入頁並保存目標路由
 * @param nextRoute 登入成功後要導向的路由（例如：/create 或 /wish/123/reply）
 * @returns 已登入返回 true，未登入返回 false（已導向登入頁）
 */
export async function requireAuth(nextRoute: string): Promise<boolean> {
  try {
    const session = await getSession();
    
    if (!session) {
      // 未登入，導向登入頁並保存目標路由
      const encodedRoute = encodeURIComponent(nextRoute);
      router.push(`/login?next=${encodedRoute}`);
      return false;
    }
    
    // 已登入
    return true;
  } catch (error) {
    console.error('[requireAuth] Exception:', error);
    // 發生錯誤時，也導向登入頁
    const encodedRoute = encodeURIComponent(nextRoute);
    router.push(`/login?next=${encodedRoute}`);
    return false;
  }
}

/**
 * 登出當前用戶
 */
export async function signOut(): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('[signOut] Error:', error);
      return { success: false, error: error.message };
    }
    
    console.log('[signOut] Success');
    return { success: true };
  } catch (error: any) {
    console.error('[signOut] Exception:', error);
    return { success: false, error: error.message || '登出失敗' };
  }
}

/**
 * 獲取當前用戶
 */
export async function getCurrentUser() {
  try {
    // 先檢查是否有 session（避免 AuthSessionMissingError）
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      // 沒有 session，表示未登入（這是正常情況，不是錯誤）
      return null;
    }
    
    // 如果有 session，獲取用戶資訊
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      // 只有在有 session 但獲取用戶失敗時才記錄錯誤
      console.error('[getCurrentUser] Error:', error);
      return null;
    }
    
    return user;
  } catch (error: any) {
    // AuthSessionMissingError 是正常情況（未登入），不需要記錄為錯誤
    if (error?.message?.includes('Auth session missing')) {
      return null;
    }
    console.error('[getCurrentUser] Exception:', error);
    return null;
  }
}

