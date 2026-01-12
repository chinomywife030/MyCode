'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function TestPushPage() {
  const [userId, setUserId] = useState('');
  const [title, setTitle] = useState('測試推播');
  const [body, setBody] = useState('這是一則測試推播通知');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // 獲取當前用戶
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUser(user);
        if (user) {
          setUserId(user.id);
        }
      } catch (error) {
        console.error('[TestPushPage] Load user error:', error);
      }
    };
    loadCurrentUser();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/push/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId || 'latest',
          title,
          body,
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error: any) {
      setResult({
        success: false,
        error: error.message || '發送失敗',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">測試推播通知</h1>

        {/* 當前用戶資訊 */}
        {currentUser && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-gray-600 mb-1">當前登入用戶：</p>
            <p className="font-mono text-sm text-gray-900">{currentUser.id}</p>
            <p className="text-sm text-gray-600 mt-1">{currentUser.email}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              User ID
            </label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="留空或輸入 'latest' 會使用最新一筆 token（測試用）"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500">
              留空或輸入 'latest' 會查詢最新一筆 token（用於測試）
            </p>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              標題
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              內容
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? '發送中...' : '發送測試推播'}
          </button>
        </form>

        {/* 結果顯示 */}
        {result && (
          <div className={`mt-6 p-4 rounded-lg ${
            result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            <h3 className="font-bold mb-2">
              {result.success ? '✅ 發送成功' : '❌ 發送失敗'}
            </h3>
            <pre className="text-xs overflow-auto bg-white p-3 rounded border">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

        {/* 使用說明 */}
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-bold text-gray-900 mb-2">使用說明</h3>
          <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
            <li>確保手機 App 已註冊 Push Token（在 Supabase device_tokens 表中有記錄）</li>
            <li>User ID 留空或輸入 'latest' 會查詢最新一筆 token（用於快速測試）</li>
            <li>無效的 token 會自動從資料庫中刪除</li>
            <li>可以同時發送給多個裝置（如果該用戶有多個 token）</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

