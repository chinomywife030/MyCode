'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/Toast';
import { formatDateRange } from '@/lib/dateFormat';
import SupporterBadge from '@/components/SupporterBadge';

export default function TripsPage() {
  const { showToast } = useToast();
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [deletingTripId, setDeletingTripId] = useState<string | null>(null);

  // 載入用戶資訊
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user);
    });
  }, []);

  // 載入行程資料
  useEffect(() => {
    async function fetchTrips() {
      setLoading(true);
      // 抓取行程資料，並關聯取出發布者的資訊 (profiles)
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('trips')
        .select('*, profiles:shopper_id(name, avatar_url, is_supporter)')
        .or(`start_date.gte.${today},end_date.gte.${today},date.gte.${today}`) // 向下相容：支援舊的 date 欄位
        .order('start_date', { ascending: true, nullsFirst: false }) // 優先使用 start_date
        .order('date', { ascending: true, nullsFirst: false }); // 向下相容：如果沒有 start_date 則用 date

      if (error) console.error('Error fetching trips:', error);
      setTrips(data || []);
      setLoading(false);
    }
    fetchTrips();
  }, []);

  // 刪除行程功能
  const handleDeleteTrip = async (tripId: string) => {
    if (!currentUser) return;
    
    // 確認對話框
    if (!confirm('確定要刪除這個行程嗎？\n刪除後不可復原。')) {
      return;
    }
    
    setDeletingTripId(tripId);
    
    try {
      // Optimistic UI: 立即從列表中移除
      setTrips(prev => prev.filter(t => t.id !== tripId));
      
      // 呼叫 API 刪除
      const { error } = await supabase
        .from('trips')
        .delete()
        .eq('id', tripId);
      
      if (error) {
        // 如果失敗，恢復列表（重新載入）
        throw error;
      }
      
      // 成功：顯示 toast
      showToast('success', '已刪除行程');
    } catch (error: any) {
      console.error('[DeleteTrip] Error:', error);
      // 失敗：重新載入列表以恢復正確狀態
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('trips')
        .select('*, profiles:shopper_id(name, avatar_url, is_supporter)')
        .or(`start_date.gte.${today},end_date.gte.${today},date.gte.${today}`)
        .order('start_date', { ascending: true, nullsFirst: false })
        .order('date', { ascending: true, nullsFirst: false });
      if (data) setTrips(data);
      showToast('error', error.message || '刪除失敗，請稍後再試');
    } finally {
      setDeletingTripId(null);
    }
  };

  // 根據搜尋關鍵字過濾 (搜尋地點或說明)
  const filteredTrips = trips.filter(trip => 
    trip.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (trip.description && trip.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-6xl mx-auto">
        
        {/* 標題與搜尋區 */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900 mb-2">✈️ 尋找代購行程</h1>
            <p className="text-gray-500">瀏覽留學生的飛行計畫，直接私訊委託幫買！</p>
          </div>
          
          <div className="relative w-full md:w-80">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input 
              type="text"
              placeholder="搜尋國家、城市 (如: 東京)..."
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* 列表內容 */}
        {loading ? (
          <div className="text-center py-20 text-gray-400">
            <div className="animate-spin text-4xl mb-4 inline-block">✈️</div>
            <p>正在搜尋航班資訊...</p>
          </div>
        ) : filteredTrips.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center border border-dashed border-gray-300">
            <span className="text-5xl block mb-4 opacity-30">📭</span>
            <h3 className="text-lg font-bold text-gray-700">找不到符合的行程</h3>
            <p className="text-gray-500 text-sm mt-1">試試看搜尋其他關鍵字，或是直接發布許願單！</p>
            <Link href="/create" className="inline-block mt-4 text-blue-600 font-bold hover:underline">
              → 去發布許願
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTrips.map((trip) => (
              <div key={trip.id} className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col h-full transform hover:-translate-y-1">
                
                {/* 頂部裝飾條 (隨機顏色或固定) */}
                <div className="h-2 bg-gradient-to-r from-blue-400 to-blue-600"></div>

                <div className="p-6 flex flex-col flex-grow">
                  {/* 日期標籤 */}
                  <div className="flex justify-between items-start mb-4">
                    <span className="bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1 rounded-full border border-blue-100 flex items-center gap-1">
                      📅 {formatDateRange(trip.start_date, trip.end_date, trip.date)}
                    </span>
                    {/* 刪除按鈕（只有擁有者可見） */}
                    {currentUser && trip.shopper_id === currentUser.id && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDeleteTrip(trip.id);
                        }}
                        disabled={deletingTripId === trip.id}
                        className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                        title="刪除行程"
                        style={{ padding: '4px' }}
                      >
                        {deletingTripId === trip.id ? (
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                        ) : (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                      </button>
                    )}
                  </div>

                  {/* 地點與說明 */}
                  <h3 className="text-2xl font-black text-gray-800 mb-2 group-hover:text-blue-600 transition-colors">
                    {trip.destination}
                  </h3>
                  <p className="text-gray-600 text-sm line-clamp-3 mb-6 flex-grow leading-relaxed">
                    {trip.description || '沒有提供詳細說明，請直接私訊詢問。'}
                  </p>

                  {/* 底部：發布者與按鈕 */}
                  <div className="pt-4 border-t border-gray-50 flex items-center justify-between mt-auto">
                    <Link href={`/profile/${trip.shopper_id}`} className="flex items-center gap-2 group/avatar">
                      <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden">
                        {trip.profiles?.avatar_url ? (
                          <img src={trip.profiles.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-500">
                            {trip.profiles?.name?.[0] || '?'}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-gray-500 group-hover/avatar:text-gray-800 transition">
                          {trip.profiles?.name || '代購夥伴'}
                        </span>
                        {trip.profiles?.is_supporter && (
                          <SupporterBadge size="small" />
                        )}
                      </div>
                    </Link>

                    <a 
                      href={`/chat?target=${trip.shopper_id}`}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition active:scale-95 shadow-md shadow-blue-100"
                    >
                      💬 私訊
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}