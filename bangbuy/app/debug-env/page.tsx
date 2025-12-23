'use client';

export default function DebugEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold mb-6 text-gray-900">環境變數檢查</h1>
        
        <div className="space-y-4">
          <div className="border-l-4 border-blue-500 pl-4">
            <p className="text-sm text-gray-600 font-medium">NEXT_PUBLIC_SUPABASE_URL</p>
            <p className="text-lg font-mono mt-1">
              {supabaseUrl || <span className="text-red-500">❌ 未設定</span>}
            </p>
          </div>

          <div className="border-l-4 border-green-500 pl-4">
            <p className="text-sm text-gray-600 font-medium">NEXT_PUBLIC_SUPABASE_ANON_KEY</p>
            <p className="text-lg font-mono mt-1">
              {hasKey ? (
                <span className="text-green-500">✅ 已設定</span>
              ) : (
                <span className="text-red-500">❌ 未設定</span>
              )}
            </p>
          </div>

          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>提示：</strong> 如果環境變數顯示未設定，請：
            </p>
            <ol className="list-decimal list-inside mt-2 text-sm text-yellow-700 space-y-1">
              <li>檢查 <code className="bg-yellow-100 px-1 rounded">.env.local</code> 文件是否存在於專案根目錄</li>
              <li>確認環境變數名稱正確（必須以 NEXT_PUBLIC_ 開頭）</li>
              <li>重新啟動開發服務器（停止後再執行 npm run dev）</li>
            </ol>
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>瀏覽器端檢查：</strong>
            </p>
            <button 
              onClick={() => {
                alert(`
URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL || '未設定'}
Key: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '已設定' : '未設定'}
                `);
              }}
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              顯示環境變數
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}














