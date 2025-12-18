import { createClient } from '@supabase/supabase-js';

// --------------------------------------------------------
// 👇 從環境變數讀取 Supabase 配置
// --------------------------------------------------------
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// 檢查是否設置環境變數 (防呆)
if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables. Please check .env.local file.');
}

// 檢測 localStorage 是否可用，Edge 瀏覽器可能有限制
const isLocalStorageAvailable = () => {
  if (typeof window === 'undefined') return false;
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
};

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: isLocalStorageAvailable(),
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // 🆕 設定較短的 token 刷新間隔（預設是過期前 60 秒，改為 5 分鐘前）
    // 這樣切換頁面時更不容易遇到過期問題
    flowType: 'pkce',
    storage: isLocalStorageAvailable() ? undefined : {
      // 如果 localStorage 不可用，使用內存存儲（Edge 私密模式的後備方案）
      getItem: (key: string) => {
        if (typeof window === 'undefined') return null;
        return (window as any).__supabaseMemoryStorage?.[key] || null;
      },
      setItem: (key: string, value: string) => {
        if (typeof window === 'undefined') return;
        (window as any).__supabaseMemoryStorage = (window as any).__supabaseMemoryStorage || {};
        (window as any).__supabaseMemoryStorage[key] = value;
      },
      removeItem: (key: string) => {
        if (typeof window === 'undefined') return;
        if ((window as any).__supabaseMemoryStorage) {
          delete (window as any).__supabaseMemoryStorage[key];
        }
      }
    }
  },
  global: {
    headers: {
      'X-Client-Info': 'supabase-js-web'
    }
  }
});

// 🆕 設定 visibility change 監聽器，頁面重新激活時嘗試刷新 session
if (typeof window !== 'undefined') {
  let lastVisibilityCheck = 0;
  const VISIBILITY_COOLDOWN = 30000; // 30 秒內不重複檢查

  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible') {
      const now = Date.now();
      if (now - lastVisibilityCheck < VISIBILITY_COOLDOWN) return;
      lastVisibilityCheck = now;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // 檢查 token 是否快過期（5 分鐘內）
          const expiresAt = session.expires_at;
          if (expiresAt) {
            const expiresIn = expiresAt * 1000 - now;
            if (expiresIn < 5 * 60 * 1000 && expiresIn > 0) {
              console.log('[supabase] Token expiring soon, refreshing...');
              await supabase.auth.refreshSession();
            }
          }
        }
      } catch (err) {
        console.error('[supabase] Session check error:', err);
      }
    }
  });
}