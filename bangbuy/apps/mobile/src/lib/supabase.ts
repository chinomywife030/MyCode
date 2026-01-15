import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 從環境變數讀取 Supabase 配置
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

// ============================================
// Fail-fast 檢查：確保環境變數已設定
// ============================================
// 這個檢查會在 App 啟動時立即執行，而不是等到 HomeScreen render 才報錯
if (!supabaseUrl || !supabaseKey) {
  const errorMessage = `
============================================
❌ 缺少 Supabase 環境變數
============================================

請確保已設定以下環境變數：
  - EXPO_PUBLIC_SUPABASE_URL
  - EXPO_PUBLIC_SUPABASE_ANON_KEY

設定方式：
  1. 本地開發：在 apps/mobile/.env.local 中設定
  2. EAS Build：在 EAS 網站的 Secrets 中設定，或在 eas.json 的 env 區塊設定

目前讀取到的值：
  - EXPO_PUBLIC_SUPABASE_URL: ${supabaseUrl ? '已設定' : '未設定'}
  - EXPO_PUBLIC_SUPABASE_ANON_KEY: ${supabaseKey ? '已設定' : '未設定'}
============================================
`;
  console.error(errorMessage);
  throw new Error('Missing Supabase environment variables. See console for details.');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});








