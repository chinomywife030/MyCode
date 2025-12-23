'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function TestSimple() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      console.log('🚀 開始');
      
      const { data: wishes } = await supabase
        .from('wish_requests')
        .select('*')
        .limit(10);
      
      const { data: trips } = await supabase
        .from('trips')
        .select('*')
        .limit(10);
      
      console.log('✅ Wishes:', wishes);
      console.log('✅ Trips:', trips);
      
      setData({ wishes, trips });
      setLoading(false);
      console.log('✅ 完成');
    }
    
    load();
  }, []);

  if (loading) return <div className="p-20 text-center">載入中...</div>;

  return (
    <div className="p-10">
      <h1 className="text-2xl font-bold mb-4">測試頁面</h1>
      
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-2">許願單 ({data?.wishes?.length || 0} 筆)</h2>
        <pre className="bg-gray-100 p-4 rounded overflow-auto">
          {JSON.stringify(data?.wishes, null, 2)}
        </pre>
      </div>
      
      <div>
        <h2 className="text-xl font-bold mb-2">行程 ({data?.trips?.length || 0} 筆)</h2>
        <pre className="bg-gray-100 p-4 rounded overflow-auto">
          {JSON.stringify(data?.trips, null, 2)}
        </pre>
      </div>
    </div>
  );
}














