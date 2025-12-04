'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function DebugPage() {
  const [wishes, setWishes] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    console.log(msg);
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);
  };

  useEffect(() => {
    async function test() {
      addLog('🚀 開始載入');
      setLoading(true);

      try {
        // 測試 1: 直接查詢 wishes
        addLog('📊 查詢 wish_requests...');
        const { data: w, error: we } = await supabase
          .from('wish_requests')
          .select('*')
          .eq('status', 'open');

        if (we) {
          addLog(`❌ Wishes 錯誤: ${we.message}`);
        } else {
          addLog(`✅ Wishes 成功: ${w?.length || 0} 筆`);
          setWishes(w || []);
        }

        // 測試 2: 直接查詢 trips
        addLog('📊 查詢 trips...');
        const { data: t, error: te } = await supabase
          .from('trips')
          .select('*');

        if (te) {
          addLog(`❌ Trips 錯誤: ${te.message}`);
        } else {
          addLog(`✅ Trips 成功: ${t?.length || 0} 筆`);
          setTrips(t || []);
        }

        addLog('✅ 全部完成');
      } catch (err: any) {
        addLog(`❌ 捕獲錯誤: ${err.message}`);
      } finally {
        setLoading(false);
        addLog('🏁 Loading 設為 false');
      }
    }

    test();
  }, []);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">🐛 除錯頁面</h1>
      
      <Link href="/" className="text-blue-600 underline mb-6 block">← 回到首頁</Link>

      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded mb-6">
        <h2 className="font-bold text-lg mb-2">狀態檢查</h2>
        <div className="space-y-2 text-sm">
          <p><strong>Loading:</strong> {loading ? '🔴 true (載入中)' : '🟢 false (已完成)'}</p>
          <p><strong>Wishes 數量:</strong> {wishes.length} 筆</p>
          <p><strong>Trips 數量:</strong> {trips.length} 筆</p>
        </div>
      </div>

      <div className="bg-gray-100 p-4 rounded mb-6">
        <h2 className="font-bold text-lg mb-2">執行日誌</h2>
        <div className="space-y-1 text-xs font-mono">
          {logs.map((log, i) => (
            <div key={i} className={log.includes('❌') ? 'text-red-600' : log.includes('✅') ? 'text-green-600' : ''}>
              {log}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border rounded p-4">
          <h3 className="font-bold mb-3">Wishes 資料</h3>
          {wishes.length === 0 ? (
            <p className="text-gray-500 text-sm">沒有資料</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {wishes.map(w => (
                <li key={w.id} className="border-b pb-2">
                  <div className="font-bold">{w.title}</div>
                  <div className="text-gray-500">${w.budget} - {w.target_country}</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white border rounded p-4">
          <h3 className="font-bold mb-3">Trips 資料</h3>
          {trips.length === 0 ? (
            <p className="text-gray-500 text-sm">沒有資料</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {trips.map(t => (
                <li key={t.id} className="border-b pb-2">
                  <div className="font-bold">{t.destination}</div>
                  <div className="text-gray-500">{t.date}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

