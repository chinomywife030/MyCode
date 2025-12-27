'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const run = async () => {
      // 檢查是否有 code 需要處理
      const code = searchParams?.get('code')
      
      if (code) {
        // 使用 exchangeCodeForSession 交換 session
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        
        if (error || !data.session) {
          console.error('[Auth Callback] Exchange code error:', error)
          router.replace('/forgot-password')
          return
        }
      }
      
      // 等待一下讓 Supabase 處理完 session
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // 檢查 session
      const { data } = await supabase.auth.getSession()

      if (!data.session) {
        router.replace('/forgot-password')
        return
      }

      router.replace('/reset-password')
    }

    run()
  }, [router, searchParams])

  return <p>驗證中…</p>
}

