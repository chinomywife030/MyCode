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
      }

      // 2. 抓取評價
      const { data: reviewsData } = await supabase
        .from('reviews')
        .select('*, reviewer:reviewer_id(name, avatar_url)')
        .eq('target_id', id)
        .order('created_at', { ascending: false });
      
      // 計算平均分
      const totalRating = reviewsData?.reduce((acc, r) => acc + r.rating, 0) || 0;
      const avgRating = reviewsData?.length ? (totalRating / reviewsData.length).toFixed(1) : '新用戶';
      
      if (profileData) {
        setProfile({ ...profileData, calculated_rating: avgRating, reviews: reviewsData || [] });
      }

      // 3. 抓取許願單
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

  if (loading) return <div className="min-h-screen bg-gray-50 pt-20 text-center text-gray-500">載入中...</div>;
  if (!profile) return <div className="min-h-screen bg-gray-50 pt-20 text-center text-gray-500">找不到此用戶</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      
      {/* 1. 頂部背景圖 */}
      <div className="h-48 bg-gradient-to-r from-blue-600 to-cyan-500 relative">
        <div className="max-w-5xl mx-auto px-4 py-6">
           <Link href="/" className="text-white/90 hover:text-white flex items-center gap-1 w-fit font-medium">
             ← 回首頁
           </Link>
        </div>
      </div>

      {/* 2. 主要內容卡片 */}
      <div className="max-w-4xl mx-auto px-4 relative -mt-16">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          
          <div className="p-6 sm:p-8">
            {/* 上半部：頭像 + 名字 + 按鈕 */}
            <div className="flex flex-col sm:flex-row items-start gap-6">
              
              {/* 頭像 */}
              <div className="relative -mt-16 sm:-mt-20 shrink-0">
                <div className="w-32 h-32 rounded-full border-4 border-white shadow-md bg-gray-200 overflow-hidden">
                  {profile.avatar_url ? (
                    <img 
                      src={profile.avatar_url} 
                      alt={profile.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-500 text-4xl font-bold">
                      {profile.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                </div>
                <span className="absolute bottom-1 right-1 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full border-2 border-white flex items-center gap-1 shadow-sm">
                  ✓ <span className="hidden sm:inline">認證</span>
                </span>
              </div>
              
              <div className="flex-grow pt-2 text-center sm:text-left">
                <h1 className="text-3xl font-bold text-gray-900">{profile.name}</h1>
                <p className="text-gray-500 mt-1 flex items-center justify-center sm:justify-start gap-2">
                  {profile.role === 'shopper' ? '✈️ 認證代購' : '🛍️ 一般買家'}
                  <span className="text-gray-300">|</span>
                  <span className="text-sm">加入於 2025</span>
                </p>
              </div>

              <div className="w-full sm:w-auto mt-4 sm:mt-0">
                <Link 
                  href={`/chat?target=${profile.id}`}
                  className="w-full sm:w-auto bg-blue-600 text-white px-6 py-2.5 rounded-full font-bold hover:bg-blue-700 transition shadow-md active:scale-95 text-center block"
                >
                  {t.profile.contact}
                </Link>
              </div>
            </div>

            {/* 數據統計欄 */}
            <div className="grid grid-cols-3 gap-4 py-6 my-8 bg-gray-50 rounded-xl border border-gray-100">
              <div className="text-center">
                <div className="text-2xl font-black text-gray-800">{profile.deals_count || 0}</div>
                <div className="text-xs text-gray-500 font-medium mt-1">{t.profile.deals}</div>
              </div>
              <div className="text-center border-l border-r border-gray-200">
                <div className="text-2xl font-black text-yellow-500 flex items-center justify-center gap-1">
                  {profile.calculated_rating} <span className="text-lg">★</span>
                </div>
                <div className="text-xs text-gray-500 font-medium mt-1">
                  {profile.reviews?.length || 0} 則評價
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-black text-gray-800">102</div>
                <div className="text-xs text-gray-500 font-medium mt-1">{t.profile.followers}</div>
              </div>
            </div>

            {/* 自我介紹 */}
            <div className="mb-10">
              <h3 className="font-bold text-gray-900 mb-3 text-lg">關於我</h3>
              <div className="text-gray-600 leading-relaxed whitespace-pre-wrap bg-white p-0">
                {profile.bio || "這位使用者很神秘，還沒寫下自我介紹。"}
              </div>
            </div>

            {/* 下方 Tab */}
            <div>
              <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-2">
                <h3 className="font-bold text-gray-900 text-lg">
                  {profile.name} {t.profile.tabs.wishes}
                </h3>
                <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                  {userWishes.length}
                </span>
              </div>
              
              {userWishes.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                  <p className="text-gray-400">目前沒有公開的許願單。</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {userWishes.map(wish => (
                    <Link key={wish.id} href={`/wish/${wish.id}`} className="block border border-gray-200 rounded-xl p-4 hover:shadow-md transition hover:border-blue-300 bg-white group">
                      <div className="flex justify-between items-start mb-2">
                         <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded font-medium">
                           {wish.target_country}
                         </span>
                         <span className="font-bold text-gray-900 group-hover:text-blue-600 transition">
                           ${wish.budget.toLocaleString()}
                         </span>
                      </div>
                      <h4 className="font-bold text-gray-700 line-clamp-1 group-hover:text-blue-600 transition">
                        {wish.title}
                      </h4>
                      <p className="text-xs text-gray-400 mt-2 line-clamp-1">{wish.description}</p>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* 評價列表區塊 */}
            <div className="mt-10 pt-10 border-t border-gray-100">
              <h3 className="font-bold text-gray-900 text-lg mb-4">💬 收到的評價</h3>
              
              {profile.reviews && profile.reviews.length > 0 ? (
                <div className="space-y-4">
                  {profile.reviews.map((review: any) => (
                    <div key={review.id} className="bg-gray-50 p-4 rounded-xl flex gap-4">
                      <div className="w-10 h-10 bg-gray-200 rounded-full overflow-hidden shrink-0">
                        {review.reviewer?.avatar_url ? (
                          <img src={review.reviewer.avatar_url} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-500 font-bold">
                            {review.reviewer?.name?.[0]}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-800">{review.reviewer?.name}</span>
                          <span className="text-yellow-500 text-sm">{'★'.repeat(review.rating)}</span>
                        </div>
                        <p className="text-gray-600 text-sm mt-1">{review.comment || "沒有留言"}</p>
                        <p className="text-gray-400 text-xs mt-2">{new Date(review.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-center py-6">還沒有收到評價喔。</p>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}