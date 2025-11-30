'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/components/LanguageProvider';

export default function ProfilePage() {
  const { id } = useParams();
  const { t } = useLanguage();
  const [profile, setProfile] = useState<any>(null);
  const [userWishes, setUserWishes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfileData() {
      if (!id) return;

      // 1. 抓個人資料
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (profileError) {
        console.error('找不到使用者', profileError);
      } else {
        setProfile(profileData);
      }

      // 2. 抓這個人貼過的許願單 (Optional: 如果你要顯示他發過的文)
      const { data: wishesData } = await supabase
        .from('wish_requests')
        .select('*')
        .eq('buyer_id', id)
        .order('created_at', { ascending: false });
      
      setUserWishes(wishesData || []);
      setLoading(false);
    }

    fetchProfileData();
  }, [id]);

  if (loading) return <div className="p-10 text-center">載入中...</div>;
  if (!profile) return <div className="p-10 text-center">找不到此用戶</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      
      {/* 頂部背景圖 (Cover) */}
      <div className="h-48 bg-gradient-to-r from-blue-500 to-cyan-400">
        <div className="max-w-4xl mx-auto px-4 pt-6">
           <Link href="/" className="text-white/80 hover:text-white flex items-center gap-1 w-fit">
             ← 回首頁
           </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-20">
        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
          
          {/* 頭像與基本資料 */}
          <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-end">
            <div className="relative">
              <img 
                src={profile.avatar_url || 'https://via.placeholder.com/150'} 
                alt={profile.name}
                className="w-32 h-32 rounded-full border-4 border-white shadow-md object-cover bg-gray-200"
              />
              <span className="absolute bottom-2 right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full border border-white">
                ✓ 實名認證
              </span>
            </div>
            
            <div className="flex-grow text-center sm:text-left mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{profile.name}</h1>
              <p className="text-gray-500 mt-1">{profile.role === 'shopper' ? '✈️ 認證代購' : '🛍️ 一般買家'}</p>
            </div>

            <button className="bg-blue-600 text-white px-6 py-2 rounded-full font-bold hover:bg-blue-700 transition shadow-md">
              {t.profile.contact}
            </button>
          </div>

          {/* 數據統計欄 */}
          <div className="grid grid-cols-3 gap-4 border-t border-b border-gray-100 py-6 my-6">
            <div className="text-center border-r border-gray-100">
              <div className="text-2xl font-bold text-gray-800">{profile.deals_count}</div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">{t.profile.deals}</div>
            </div>
            <div className="text-center border-r border-gray-100">
              <div className="text-2xl font-bold text-yellow-500 flex items-center justify-center gap-1">
                {profile.rating} <span className="text-sm">★</span>
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">{t.profile.rating}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-800">1,203</div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">{t.profile.followers}</div>
            </div>
          </div>

          {/* 自我介紹 */}
          <div className="mb-8">
            <h3 className="font-bold text-gray-800 mb-2">關於我</h3>
            <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
              {profile.bio}
            </p>
          </div>

          {/* 下方 Tab：顯示他的許願單 */}
          <div>
            <h3 className="font-bold text-gray-800 mb-4 border-b border-gray-200 pb-2 inline-block">
              {profile.name} {t.profile.tabs.wishes}
            </h3>
            
            {userWishes.length === 0 ? (
              <p className="text-gray-400">目前沒有公開的許願單。</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {userWishes.map(wish => (
                  <Link key={wish.id} href={`/wish/${wish.id}`} className="block border border-gray-100 rounded-lg p-4 hover:shadow-md transition bg-gray-50">
                    <div className="flex justify-between items-center mb-2">
                       <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                         {wish.target_country}
                       </span>
                       <span className="font-bold text-gray-700">${wish.budget}</span>
                    </div>
                    <h4 className="font-bold text-gray-800 line-clamp-1">{wish.title}</h4>
                  </Link>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}