'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function DiagnosticPage() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function runDiagnostics() {
      const testResults: any[] = [];

      // 測試 1: 檢查環境變數
      testResults.push({
        test: '1. 環境變數檢查',
        status: process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder') ? '✅' : '❌',
        details: `URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL || '未設定'}`,
        solution: process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder') ? '請更新 .env.local 中的 Supabase URL' : null
      });

      // 測試 2: 測試 wish_requests 表格
      try {
        const { data: wishes, error: wishError } = await supabase
          .from('wish_requests')
          .select('*')
          .limit(1);

        testResults.push({
          test: '2. wish_requests 表格查詢',
          status: wishError ? '❌' : '✅',
          details: wishError ? `錯誤: ${wishError.message}` : `成功！找到 ${wishes?.length || 0} 筆資料`,
          error: wishError,
          solution: wishError?.message.includes('relation') ? '請在 Supabase 中創建 wish_requests 表格' :
                   wishError?.message.includes('permission') ? '請檢查 RLS 政策，需要允許匿名讀取' : null
        });
      } catch (e: any) {
        testResults.push({
          test: '2. wish_requests 表格查詢',
          status: '❌',
          details: `錯誤: ${e.message}`,
          error: e
        });
      }

      // 測試 3: 測試帶 profiles 關聯的查詢
      try {
        const { data: wishes, error: wishError } = await supabase
          .from('wish_requests')
          .select('*, profiles:buyer_id(name, avatar_url)')
          .eq('status', 'open')
          .limit(1);

        testResults.push({
          test: '3. wish_requests + profiles 關聯查詢',
          status: wishError ? '❌' : '✅',
          details: wishError ? `錯誤: ${wishError.message}` : `成功！`,
          error: wishError,
          solution: wishError?.message.includes('relation') ? '請確認 profiles 表格存在' :
                   wishError?.message.includes('foreign key') ? '請確認 wish_requests.buyer_id 有外鍵關聯到 profiles.id' : null
        });
      } catch (e: any) {
        testResults.push({
          test: '3. wish_requests + profiles 關聯查詢',
          status: '❌',
          details: `錯誤: ${e.message}`,
          error: e
        });
      }

      // 測試 4: 測試 trips 表格
      try {
        const { data: trips, error: tripError } = await supabase
          .from('trips')
          .select('*')
          .limit(1);

        testResults.push({
          test: '4. trips 表格查詢',
          status: tripError ? '❌' : '✅',
          details: tripError ? `錯誤: ${tripError.message}` : `成功！找到 ${trips?.length || 0} 筆資料`,
          error: tripError,
          solution: tripError?.message.includes('relation') ? '請在 Supabase 中創建 trips 表格' :
                   tripError?.message.includes('permission') ? '請檢查 RLS 政策' : null
        });
      } catch (e: any) {
        testResults.push({
          test: '4. trips 表格查詢',
          status: '❌',
          details: `錯誤: ${e.message}`,
          error: e
        });
      }

      // 測試 5: 測試 profiles 表格
      try {
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .limit(1);

        testResults.push({
          test: '5. profiles 表格查詢',
          status: profileError ? '❌' : '✅',
          details: profileError ? `錯誤: ${profileError.message}` : `成功！找到 ${profiles?.length || 0} 筆資料`,
          error: profileError,
          solution: profileError?.message.includes('relation') ? '請在 Supabase 中創建 profiles 表格' : null
        });
      } catch (e: any) {
        testResults.push({
          test: '5. profiles 表格查詢',
          status: '❌',
          details: `錯誤: ${e.message}`,
          error: e
        });
      }

      setResults(testResults);
      setLoading(false);
    }

    runDiagnostics();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">🔍 Supabase 連接診斷</h1>
        <p className="text-gray-600 mb-8">檢查許願單無法載入的原因</p>

        {loading ? (
          <div className="text-center py-10">
            <div className="text-xl">正在執行診斷測試...</div>
          </div>
        ) : (
          <div className="space-y-4">
            {results.map((result, index) => (
              <div
                key={index}
                className={`p-6 rounded-lg border-2 ${
                  result.status === '✅'
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{result.status}</span>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg mb-2">{result.test}</h3>
                    <p className="text-gray-700 mb-2">{result.details}</p>

                    {result.solution && (
                      <div className="mt-3 p-3 bg-yellow-100 border border-yellow-300 rounded">
                        <p className="font-medium text-yellow-800">💡 解決方案：</p>
                        <p className="text-yellow-700">{result.solution}</p>
                      </div>
                    )}

                    {result.error && (
                      <details className="mt-3">
                        <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                          查看完整錯誤訊息
                        </summary>
                        <pre className="mt-2 p-3 bg-gray-800 text-green-400 text-xs rounded overflow-auto">
                          {JSON.stringify(result.error, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            ))}

            <div className="mt-8 p-6 bg-blue-50 border-2 border-blue-200 rounded-lg">
              <h3 className="font-bold text-lg mb-3">📚 常見問題解決步驟</h3>
              <ol className="space-y-2 text-sm">
                <li className="flex gap-2">
                  <span className="font-bold">1.</span>
                  <span>如果表格不存在，請在 Supabase SQL Editor 中創建表格</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold">2.</span>
                  <span>如果是權限錯誤，請在 Supabase 中設定 RLS 政策：
                    <ul className="ml-4 mt-1 space-y-1">
                      <li>• wish_requests: 允許 SELECT (status = 'open')</li>
                      <li>• trips: 允許 SELECT</li>
                      <li>• profiles: 允許 SELECT</li>
                    </ul>
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold">3.</span>
                  <span>如果是外鍵錯誤，請確認表格之間的關聯設定正確</span>
                </li>
              </ol>
            </div>

            <div className="mt-6 flex gap-4">
              <a
                href="/"
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
              >
                返回首頁測試
              </a>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition"
              >
                重新執行診斷
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
