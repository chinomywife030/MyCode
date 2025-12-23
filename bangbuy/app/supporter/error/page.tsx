'use client';

import Link from 'next/link';

export default function SupporterErrorPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* 錯誤圖示 */}
        <div className="mb-8">
          <div className="w-24 h-24 mx-auto bg-gradient-to-r from-red-400 to-orange-400 rounded-full flex items-center justify-center shadow-lg">
            <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        </div>

        {/* 標題 */}
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          付款未完成
        </h1>

        {/* 說明 */}
        <p className="text-gray-600 mb-8 leading-relaxed">
          付款未完成或確認失敗，請重試或稍後再試。
          <br />
          如果問題持續發生，請聯繫客服。
        </p>

        {/* 可能原因 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-8 text-left">
          <p className="font-medium text-gray-800 mb-3">可能的原因：</p>
          <ul className="text-sm text-gray-600 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-orange-500 mt-0.5">•</span>
              PayPal 付款過程中被取消
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500 mt-0.5">•</span>
              網路連線中斷
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500 mt-0.5">•</span>
              PayPal 帳戶餘額不足
            </li>
          </ul>
        </div>

        {/* 按鈕 */}
        <div className="space-y-3">
          <Link 
            href="/supporter/checkout"
            className="block w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-xl font-bold hover:from-purple-700 hover:to-pink-700 transition shadow-lg"
          >
            重新嘗試
          </Link>
          
          <Link 
            href="/supporter"
            className="block w-full bg-white text-gray-700 py-4 rounded-xl font-bold border border-gray-200 hover:bg-gray-50 transition"
          >
            返回 Supporter 說明頁
          </Link>
        </div>

        {/* 客服連結 */}
        <p className="text-sm text-gray-500 mt-8">
          需要幫助？請聯繫 <a href="mailto:support@bangbuy.app" className="text-purple-600 hover:underline">support@bangbuy.app</a>
        </p>
      </div>
    </div>
  );
}

