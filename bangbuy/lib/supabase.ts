import { createClient } from '@supabase/supabase-js';

// --------------------------------------------------------
// 👇 請去 Supabase 後台 -> Project Settings -> API 複製貼上
// --------------------------------------------------------
const supabaseUrl = 'https://iaizclcplchjhbfafkiy.supabase.co'; // 您的 Project URL
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhaXpjbGNwbGNoamhiZmFma2l5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0Mzg0ODMsImV4cCI6MjA4MDAxNDQ4M30.mKrm8yObbrpTZvt5Qp90mNy638qGPEjYtxHu_7cLTiI'; // 您的 Anon Public Key

// 檢查是否填寫 (防呆)
if (supabaseUrl.includes('xxxx') || !supabaseKey) {
  console.error('❌ 錯誤：請在 lib/supabase.ts 填入正確的 Supabase 網址與 Key！');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
});