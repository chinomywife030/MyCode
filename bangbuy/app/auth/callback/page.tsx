'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const run = async () => {
      // ⛔ 不要在這裡判斷 session 成功與否
      // Supabase recovery 會在 reset-password 再完成流程

      // 確保 supabase 有機會處理 hash
      await supabase.auth.getSession()

      // 一律導向 reset-password
      router.replace('/reset-password')
    }

    run()
  }, [router])

  return <p>驗證中…</p>
}

