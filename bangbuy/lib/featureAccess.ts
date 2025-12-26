import { supabase } from '@/lib/supabase';

interface FeatureFlag {
  key: string;
  description: string | null;
  enabled_for: 'public' | 'member' | 'supporter';
  rollout_percentage: number | null;
}

interface UserContext {
  isLoggedIn: boolean;
  isSupporter: boolean;
  userId?: string;
}

/**
 * 檢查用戶是否有權限訪問特定 feature flag
 */
export async function hasAccess(user: UserContext, flagKey: string): Promise<boolean> {
  try {
    // 查詢 feature flag
    const { data: flag, error } = await supabase
      .from('feature_flags')
      .select('*')
      .eq('key', flagKey)
      .maybeSingle();

    if (error || !flag) {
      console.log(`[FeatureAccess] Flag "${flagKey}" not found, defaulting to false`);
      return false;
    }

    const featureFlag = flag as FeatureFlag;

    // 根據 enabled_for 判斷權限
    switch (featureFlag.enabled_for) {
      case 'public':
        // 所有人可用
        return true;
      
      case 'member':
        // 只有登入用戶可用
        return user.isLoggedIn;
      
      case 'supporter':
        // 只有 Supporter 可用
        return user.isLoggedIn && user.isSupporter;
      
      default:
        return false;
    }
  } catch (err) {
    console.error('[FeatureAccess] Error checking access:', err);
    return false;
  }
}

/**
 * 同步檢查用戶權限（需要已經有 flag 資料）
 */
export function hasAccessSync(
  user: UserContext, 
  flag: FeatureFlag | null
): boolean {
  if (!flag) return false;

  switch (flag.enabled_for) {
    case 'public':
      return true;
    case 'member':
      return user.isLoggedIn;
    case 'supporter':
      return user.isLoggedIn && user.isSupporter;
    default:
      return false;
  }
}

/**
 * 獲取所有 feature flags
 */
export async function getAllFeatureFlags(): Promise<FeatureFlag[]> {
  try {
    const { data, error } = await supabase
      .from('feature_flags')
      .select('*')
      .order('key');

    if (error) {
      console.error('[FeatureAccess] Error fetching flags:', error);
      return [];
    }

    return (data || []) as FeatureFlag[];
  } catch (err) {
    console.error('[FeatureAccess] Error:', err);
    return [];
  }
}










