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