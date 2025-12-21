'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CreateTripPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  // 1. 檢查登入
  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('請先登入才能發布行程喔！');
        router.push('/login');
      } else {
        setUser(user);
      }
    }
    checkUser();
  }, [router]);
  
  const [formData, setFormData] = useState({
    destination: '',
    date: '',
    description: '',
  });

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      // 2. 確保 Profile 存在 (如果是新用戶)
      const userName = user.email?.split('@')[0] || '代購夥伴';
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: user.id,
        name: userName,
        role: 'shopper', // 這裡標記為代購者
      }, { onConflict: 'id' });

      // Fix: check profile upsert error
      if (profileError) {
        console.error('[CreateTrip] Profile upsert failed:', profileError);
        throw profileError;
      }

      // 3. 寫入行程 (用真正的 ID)
      const { error } = await supabase.from('trips').insert([
        {
          destination: formData.destination,
          date: formData.date,
          description: formData.description,
          shopper_id: user.id, // 👈 真正的 ID
          shopper_name: userName, // 暫時存名字，之後可以用關聯查
        },
      ]);

      if (error) {
        console.error('[CreateTrip] Trip insert failed:', error);
        throw error;
      }

      alert('🎉 行程發布成功！');
      router.push('/trips');

    } catch (error: any) {
      console.error('[CreateTrip] Error:', error);
      alert('發生錯誤：' + (error.message || '未知錯誤'));
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <div className="p-10 text-center">檢查權限中...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        {/* 🎨 Header 使用橙色（代購者身份）*/}
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 -mx-8 -mt-8 mb-6 px-8 py-6 rounded-t-xl">
          <h2 className="text-2xl font-bold text-white text-center">
            ✈️ 發布我的行程
          </h2>
          <p className="text-white/80 text-sm text-center mt-1">
            分享你的行程，接受代購委託
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div>
            <label className="block text-sm font-medium text-gray-700">我要去哪裡？</label>
            <input
              name="destination"
              required
              placeholder="例如：日本東京、韓國首爾..."
              className="mt-1 block w-full rounded-md border border-gray-300 p-3 shadow-sm focus:ring-orange-500 focus:border-orange-500"
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">出發/連線日期</label>
            <input
              name="date"
              type="date"
              required
              className="mt-1 block w-full rounded-md border border-gray-300 p-3 shadow-sm focus:ring-orange-500 focus:border-orange-500"
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">代購說明</label>
            <textarea
              name="description"
              required
              rows={4}
              placeholder="例如：主要去迪士尼樂園，只接輕便物品，不接電器..."
              className="mt-1 block w-full rounded-md border border-gray-300 p-3 shadow-sm focus:ring-orange-500 focus:border-orange-500"
              onChange={handleChange}
            />
          </div>

          {/* 🔐 內容合法提示（UGC 風險管理） */}
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-lg space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-xl flex-shrink-0">⚠️</span>
              <div className="flex-1 space-y-2">
                <p className="text-xs text-amber-900 font-semibold leading-relaxed">
                  發布內容即表示您同意
                  <Link href="/terms" target="_blank" className="text-orange-600 hover:underline font-bold mx-1">
                    《使用條款》
                  </Link>
                  ，並保證內容合法、不侵權。
                </p>
                <p className="text-xs text-amber-800 leading-relaxed">
                  本平台可在不另行通知下移除內容、限制功能或停權（詳見
                  <Link href="/terms" target="_blank" className="text-orange-600 hover:underline font-semibold mx-1">
                    《使用條款》
                  </Link>
                  ）。
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-2">
            <button 
              type="button"
              onClick={() => router.push('/')}
              className="w-1/3 flex justify-center py-3 px-4 border border-gray-300 rounded-md text-gray-700 font-medium hover:bg-gray-50"
            >
              取消
            </button>
            {/* 🎨 按鈕使用橙色（代購者身份）*/}
            <button
              type="submit"
              disabled={loading}
              className={`w-2/3 flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
                ${loading ? 'bg-gray-400' : 'bg-orange-500 hover:bg-orange-600'}`}
            >
              {loading ? '發布中...' : '確認發布'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}