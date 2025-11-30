'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Calculator from '@/components/Calculator';
import Link from 'next/link';
import { useLanguage } from '@/components/LanguageProvider';

export default function TripsPage() {
  const { t } = useLanguage();
  const [trips, setTrips] = useState<any[]>([]);

  useEffect(() => {
    async function fetchTrips() {
      const { data } = await supabase
        .from('trips')
        .select('*')
        .order('created_at', { ascending: false });
      setTrips(data || []);
    }
    fetchTrips();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto mb-6">
        <Link href="/" className="text-gray-500 hover:text-blue-600 flex items-center gap-1 w-fit">
          ← 回首頁
        </Link>
      </div>

      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8 flex items-center gap-2">
          ✈️ 留學生行程牆
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* 左邊：行程列表 */}
          <div className="md:col-span-2 space-y-4">
            {trips.length === 0 ? (
              <p className="text-gray-500 bg-white p-6 rounded-xl">目前沒有行程喔！</p>
            ) : trips.map((trip) => (
              <div key={trip.id} className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-500 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:shadow-md transition">
                <div className="flex-grow">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-bold">
                      即將出發
                    </span>
                    <span className="text-gray-500 text-sm">📅 {trip.date}</span>
                  </div>
                  
                  <h3 className="text-xl font-bold mb-2 text-gray-800">
                    {trip.destination}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {trip.description}
                  </p>

                  {/* 點頭像也可以連去個人頁 */}
                  <Link 
                    href={`/profile/${trip.shopper_id}`} 
                    className="flex items-center gap-2 group w-fit cursor-pointer"
                  >
                    <div className="w-8 h-8 bg-gray-200 rounded-full overflow-hidden border border-gray-200 group-hover:border-blue-500 transition">
                      <img src="https://via.placeholder.com/150" alt="avatar" className="w-full h-full object-cover opacity-50" />
                    </div>
                    <span className="text-sm text-gray-500 group-hover:text-blue-600 transition font-medium">
                      代購人：{trip.shopper_name}
                    </span>
                  </Link>
                </div>

                {/* 🔽 這裡！按鈕現在會連去聊天室了 */}
                <Link 
                  href={`/chat?target=${trip.shopper_id}`}
                  className="w-full sm:w-auto bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 shadow-sm whitespace-nowrap text-center block"
                >
                  私訊委託
                </Link>
              </div>
            ))}
          </div>

          {/* 右邊：計算機 & 發布按鈕 */}
          <div className="md:col-span-1">
            <div className="sticky top-8">
              <Calculator />
              
              <div className="mt-6 bg-blue-50 p-4 rounded-xl border border-blue-100">
                <h4 className="font-bold text-blue-800 mb-2">💡 想要發布行程？</h4>
                <p className="text-sm text-blue-600 mb-3">
                  如果你是留學生，發布行程可以賺取額外收入喔！
                </p>
                <Link 
                  href="/trips/create"
                  className="block w-full bg-white border border-blue-200 text-blue-600 py-2 rounded-lg text-sm hover:bg-blue-50 text-center font-medium"
                >
                  ＋ 發布我的行程
                </Link>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}