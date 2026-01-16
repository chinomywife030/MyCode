import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 從環境變數讀取 Supabase 配置
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

// ============================================
// Fail-fast 檢查：確保環境變數已設定
// ============================================
// 這個檢查會在 App 啟動時立即執行，而不是等到 HomeScreen render 才報錯
// ------------------------------------------------------------------
// Defensive Configuration: Prevent Hard Crash
// ------------------------------------------------------------------
// Instead of throwing a fatal error and crashing the app on launch,
// we log a critical warning and provide "dummy" credentials.
// This allows the app to boot, and subsequent API calls will fail 
// gracefully (caught by global error handlers) or show UI errors,
// allowing the user to troubleshoot or at least see the Error Boundary.

let validConfig = true;

if (!supabaseUrl || !supabaseKey) {
  validConfig = false;
  const errorMessage = `
============================================
⚠️ CRITICAL WARNING: Supabase Env Vars Missing
============================================

The app is running in "Defensive Mode" with dummy credentials.
All Supabase calls WILL FAIL, but the app will not crash on launch.

Please check:
  - EXPO_PUBLIC_SUPABASE_URL
  - EXPO_PUBLIC_SUPABASE_ANON_KEY

Values read:
  - URL: ${supabaseUrl ? 'Set' : 'MISSING'}
  - KEY: ${supabaseKey ? 'Set' : 'MISSING'}
============================================
`;
  console.error(errorMessage);
}

// Use fallbacks to ensure createClient doesn't throw
const finalUrl = supabaseUrl || 'https://placeholder.supabase.co';
const finalKey = supabaseKey || 'placeholder-key';

export const supabase = createClient(finalUrl, finalKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});








