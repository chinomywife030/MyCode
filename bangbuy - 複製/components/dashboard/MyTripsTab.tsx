'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import EmptyState from '@/components/EmptyState';

interface MyTripsTabProps {
  userId: string;
}

// 簡單的 cache：記住已載入的資料
const tripsCache = new Map<string, { data: any[]; timestamp: number }>();
const CACHE_DURATION = 30000; // 30 秒

export default function MyTripsTab({ userId }: MyTripsTabProps) {
  const [myTrips, setMyTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTrips() {
      // 檢查 cache
      const cached = tripsCache.get(userId);
      const now = Date.now();
      if (cached && (now - cached.timestamp) < CACHE_DURATION) {
        setMyTrips(cached.data);
        setLoading(false);
        return;
      }

      const { data: trips } = await supabase
        .from('trips')
        .select('*')
        .eq('shopper_id', userId)
        .order('created_at', { ascending: false });
      
      const tripsData = trips || [];
      setMyTrips(tripsData);
      tripsCache.set(userId, { data: tripsData, timestamp: now });
      setLoading(false);
    }
    fetchTrips();
  }, [userId]);

  const handleDeleteTrip = async (id: string) => {
    if (!confirm('確定要刪除這個行程嗎？')) return;
    await supabase.from('trips').delete().eq('id', id);
    const updated = myTrips.filter((t) => t.id !== id);
    setMyTrips(updated);
    // 清除 cache，強制下次重新載入
    tripsCache.delete(userId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (myTrips.length === 0) {
    return (
      <EmptyState 
        icon="✈️" 
        title="還沒有行程"
        description="你還沒有發布任何代購行程，開始規劃你的第一個行程吧！"
        actionLabel="發布行程"
        actionHref="/trips/create"
      />
    );
  }

  return (
    <div className="space-y-4">
      {myTrips.map((trip) => (
        <div key={trip.id} className="border-l-4 border-blue-500 bg-gray-50 rounded-r-lg p-4 flex justify-between items-center">
          <div className="flex-grow">
            <h3 className="font-bold text-gray-800 mb-1">{trip.destination}</h3>
            <p className="text-sm text-gray-500">日期: {trip.date}</p>
            {trip.notes && (
              <p className="text-sm text-gray-600 mt-2">{trip.notes}</p>
            )}
          </div>
          <button 
            onClick={() => handleDeleteTrip(trip.id)} 
            className="text-red-400 hover:text-red-600 text-sm px-4 py-2 transition"
          >
            刪除
          </button>
        </div>
      ))}
    </div>
  );
}

