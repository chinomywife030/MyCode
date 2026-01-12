'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import EmptyState from '@/components/EmptyState';
import { formatDateRange } from '@/lib/dateFormat';

export default function MyTripsPage() {
  const [myTrips, setMyTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTrips() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Full page reload 導航
        window.location.assign('/login');
        return;
      }

      const { data: trips } = await supabase
        .from('trips')
        .select('*')
        .eq('shopper_id', user.id)
        .order('created_at', { ascending: false });
      
      setMyTrips(trips || []);
      setLoading(false);
    }
    fetchTrips();
  }, []);

  const handleDeleteTrip = async (id: string) => {
    if (!confirm('確定要刪除這個行程嗎？')) return;
    const { error } = await supabase.from('trips').delete().eq('id', id);
    if (error) {
      alert('刪除失敗：' + error.message);
      return;
    }
    // 使用 client-side 更新，不 reload
    setMyTrips(prev => prev.filter(trip => trip.id !== id));
  };

  if (loading) {
    return (
      <DashboardLayout title="✈️ 我的行程" activeTab="trips">
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (myTrips.length === 0) {
    return (
      <DashboardLayout title="✈️ 我的行程" activeTab="trips">
        <EmptyState 
          icon="✈️" 
          title="還沒有行程"
          description="你還沒有發布任何代購行程，開始規劃你的第一個行程吧！"
          actionLabel="發布行程"
          actionHref="/trips/create"
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="✈️ 我的行程" activeTab="trips">
      <div className="space-y-4">
        {myTrips.map((trip) => (
          <div key={trip.id} className="border-l-4 border-blue-500 bg-gray-50 rounded-r-lg p-4 flex justify-between items-center">
            <div className="flex-grow">
              <h3 className="font-bold text-gray-800 mb-1">{trip.destination}</h3>
              <p className="text-sm text-gray-500">日期: {formatDateRange(trip.start_date, trip.end_date, trip.date)}</p>
              {trip.description && (
                <p className="text-sm text-gray-600 mt-2">{trip.description}</p>
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
    </DashboardLayout>
  );
}
