'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/components/LanguageProvider';
import { Profile } from '@/types';

export default function ProfilePage() {
  const { id } = useParams();
  const { t } = useLanguage();
  const [profile, setProfile] = useState<Profile | null>(null);

  const [userWishes, setUserWishes] = useState<any[]>([]);
  const [completedOrders, setCompletedOrders] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'wishes' | 'history' | 'reviews'>('wishes');

  useEffect(() => {
    async function fetchProfileData() {
      if (!id) return;

      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', id).single();
      if (profileData) {
        setProfile(profileData);
      }

      const { data: wishesData } = await supabase
        .from('wish_requests')
        .select('*')
        .eq('buyer_id', id)
        .eq('status', 'open')
        .order('created_at', { ascending: false });
      setUserWishes(wishesData || []);

      const { data: historyData } = await supabase
        .from('orders')
        .select(`
          id, price, created_at,
          wish_requests (title, images, target_country)
        `)
        .eq('shopper_id', id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });
      setCompletedOrders(historyData || []);

      const { data: reviewsData } = await supabase
        .from('reviews')
        .select(`
          *,
          reviewer:profiles!reviews_reviewer_id_fkey(name, avatar_url)
        `)
        .eq('target_id', id)
        .order('created_at', { ascending: false });
      setReviews(reviewsData || []);

      setLoading(false);
    }

    fetchProfileData();
  }, [id]);

  if (loading) return <div className="min-h-screen bg-gray-50 pt-20 text-center text-gray-500">載入中...</div>;
  if (!profile) return <div className="min-h-screen bg-gray-50 pt-20 text-center text-gray-500">找不到此用戶</div>;

  const displayRating = profile.rating_avg ? profile.rating_avg.toFixed(1) : '暫無評價';

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="h-48 bg-gradient-to-r from-blue-600 to-cyan-500 relative">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <Link href="/" className="text-white/90 hover:text-white flex items-center gap-1 w-fit font-medium">
            ← 回到首頁
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 relative -mt-16">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-start gap-6">
              <div className="relative -mt-16 sm:-mt-20 shrink-0">
                <div className="w-32 h-32 rounded-full border-4 border-white shadow-md bg-gray-200 overflow-hidden">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt={profile.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-500 text-4xl font-bold">
                      {profile.name?.[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
                {profile.verification_status === 'verified' && (
                  <span className="absolute bottom-1 right-1 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full border-2 border-white flex items-center gap-1 shadow-sm">
                    ✅ 已驗證
                  </span>
                )}
              </div>

              <div className="flex-grow pt-2 text-center sm:text-left">
                <h1 className="text-3xl font-bold text-gray-900">{profile.name}</h1>
                <p className="text-gray-500 mt-1 flex items-center justify-center sm:justify-start gap-2">
                  {profile.role === 'shopper' ? '代購 / 留學生' : '買家'}
                  <span className="text-gray-300">|</span>
                  <span className="text-sm">加入於 {new Date().getFullYear()}</span>
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

            <div className="grid grid-cols-3 gap-4 py-6 my-8 bg-gray-50 rounded-xl border border-gray-100">
              <div className="text-center group cursor-help" title="完成的訂單數量">
                <div className="text-2xl font-black text-gray-800">{profile.deals_count || 0}</div>
                <div className="text-xs text-gray-500 font-medium mt-1">成交訂單</div>
              </div>
              <div className="text-center border-l border-r border-gray-200">
                <div className="text-2xl font-black text-yellow-500 flex items-center justify-center gap-1">
                  {displayRating} <span className="text-lg">★</span>
                </div>
                <div className="text-xs text-gray-500 font-medium mt-1">信任評分</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-black text-gray-800">{reviews.length}</div>
                <div className="text-xs text-gray-500 font-medium mt-1">收到評價</div>
              </div>
            </div>

            <div className="mb-8">
              <div className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                {profile.bio || '這位用戶還沒有留下自我介紹。'}
              </div>
            </div>

            <div className="flex border-b border-gray-200 mb-6">
              <button
                onClick={() => setActiveTab('wishes')}
                className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'wishes' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                需求清單 ({userWishes.length})
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'history' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                代購紀錄 ({completedOrders.length})
              </button>
              <button
                onClick={() => setActiveTab('reviews')}
                className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'reviews' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                評價 ({reviews.length})
              </button>
            </div>

            <div className="min-h-[200px]">
              {activeTab === 'wishes' && (
                userWishes.length === 0 ? (
                  <p className="text-gray-400 text-center py-10">目前沒有公開的需求。</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {userWishes.map((wish) => (
                      <Link key={wish.id} href={`/wish/${wish.id}`} className="block border border-gray-200 rounded-xl p-4 hover:shadow-md transition hover:border-blue-300 bg-white group">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded font-medium">{wish.target_country}</span>
                          <span className="font-bold text-gray-900">${wish.budget.toLocaleString()}</span>
                        </div>
                        <h4 className="font-bold text-gray-700 line-clamp-1 group-hover:text-blue-600">{wish.title}</h4>
                      </Link>
                    ))}
                  </div>
                )
              )}

              {activeTab === 'history' && (
                completedOrders.length === 0 ? (
                  <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <span className="text-4xl block mb-2 opacity-30">📦</span>
                    <p className="text-gray-400">尚未有代購紀錄。</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {completedOrders.map((order) => (
                      <div key={order.id} className="flex gap-4 p-4 border border-gray-100 rounded-xl bg-gray-50/50 hover:bg-white hover:shadow-sm transition">
                        <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden shrink-0">
                          {order.wish_requests?.images?.[0] ? (
                            <img src={order.wish_requests.images[0]} className="w-full h-full object-cover grayscale opacity-80" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xl">🎁</div>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded">已完成</span>
                            <span className="text-xs text-gray-500">{new Date(order.created_at).toLocaleDateString()}</span>
                          </div>
                          <h4 className="font-bold text-gray-700">{order.wish_requests?.title || '未知商品'}</h4>
                          <p className="text-sm text-gray-500">代購地：{order.wish_requests?.target_country}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}

              {activeTab === 'reviews' && (
                reviews.length === 0 ? (
                  <p className="text-gray-400 text-center py-10">尚未收到任何評價。</p>
                ) : (
                  <div className="space-y-4">
                    {reviews.map((review) => (
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
                          <p className="text-gray-600 text-sm mt-1">{review.comment || '尚無文字評論'}</p>
                          <p className="text-gray-400 text-xs mt-2">{new Date(review.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
