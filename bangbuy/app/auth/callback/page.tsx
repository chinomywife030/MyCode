'use client'

import { useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const hasProcessedRef = useRef(false)

  useEffect(() => {
    const run = async () => {
      // 防止重複執行（React strict mode guard）
      if (hasProcessedRef.current) return
      hasProcessedRef.current = true

      try {
        // 1. 檢查 URL 中是否有 code query 參數
        const code = searchParams.get('code')
        
        if (code) {
          // 使用 code 交換 session
          console.log('[Auth Callback] 發現 code，進行交換...')
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)
          
          if (error) {
            console.error('[Auth Callback] exchangeCodeForSession error:', error)
            // 即使失敗也導向 reset-password，讓它顯示錯誤
            router.replace('/reset-password')
            return
          }
          
          if (data.session) {
            console.log('[Auth Callback] Session 建立成功')
            // 等待一小段時間確保 session 已保存
            await new Promise(resolve => setTimeout(resolve, 100))
            router.replace('/reset-password')
            return
          }
        }

        // 2. 檢查是否有 hash fragment (access_token)
        if (typeof window !== 'undefined' && window.location.hash) {
          const hash = window.location.hash.substring(1)
          const params = new URLSearchParams(hash)
          const accessToken = params.get('access_token')
          const refreshToken = params.get('refresh_token')
          const type = params.get('type')

          if (accessToken && refreshToken && type === 'recovery') {
            console.log('[Auth Callback] 發現 hash token，設定 session...')
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            })

            if (error) {
              console.error('[Auth Callback] setSession error:', error)
              router.replace('/reset-password')
              return
            }

            if (data.session) {
              console.log('[Auth Callback] Session 建立成功 (hash)')
              // 等待一小段時間確保 session 已保存
              await new Promise(resolve => setTimeout(resolve, 100))
              router.replace('/reset-password')
              return
            }
          }
        }

        // 3. 如果沒有 code 也沒有 hash，嘗試讓 Supabase 自動處理
        console.log('[Auth Callback] 沒有 code/hash，嘗試自動處理...')
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('[Auth Callback] getSession error:', error)
        }

        // 等待一下讓 detectSessionInUrl 有機會處理
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // 再次檢查 session
        const { data: { session: sessionAfterWait } } = await supabase.auth.getSession()
        
        if (sessionAfterWait) {
          console.log('[Auth Callback] Session 自動建立成功')
          router.replace('/reset-password')
        } else {
          console.log('[Auth Callback] 無法建立 session，導向 reset-password 顯示錯誤')
          router.replace('/reset-password')
        }
      } catch (error: any) {
        console.error('[Auth Callback] Exception:', error)
        router.replace('/reset-password')
      }
    }

    run()
  }, [router, searchParams])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500">驗證中…</p>
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">載入中…</p>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  )
}

