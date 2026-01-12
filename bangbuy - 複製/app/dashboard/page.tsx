'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function Dashboard() {
  useEffect(() => {
    // 檢查登入狀態
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        // Full page reload 導航
        window.location.assign('/login');
        return;
      }
      // 預設重定向到「我的需求」（full page reload）
      window.location.assign('/dashboard/wishes');
    });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center text-gray-500">
      載入中...
    </div>
  );
}
