import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// 檢查是否為佔位符或空值
const isPlaceholder = !supabaseUrl ||
                      !supabaseAnonKey ||
                      supabaseUrl.includes('placeholder') ||
                      supabaseAnonKey.includes('placeholder')

if (isPlaceholder && typeof window !== 'undefined') {
  console.warn('⚠️ Supabase 憑證未配置或使用佔位符。請在 .env.local 中設定正確的 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)