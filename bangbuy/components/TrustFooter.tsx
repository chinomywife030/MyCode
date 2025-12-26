/**
 * 🔒 TrustFooter - 對外互動頁面底部信任連結
 * 
 * 用於登入、註冊、忘記密碼、驗證等對外頁面
 * 包含 Privacy Policy、Terms of Service、聯絡信箱
 */

import Link from 'next/link';

interface TrustFooterProps {
  className?: string;
}

export default function TrustFooter({ className = '' }: TrustFooterProps) {
  return (
    <div className={`text-center text-xs text-gray-500 space-y-2 ${className}`}>
      {/* 法務連結 */}
      <div className="flex items-center justify-center gap-3 flex-wrap">
        <Link href="/privacy" className="hover:text-blue-600 hover:underline transition">
          Privacy Policy
        </Link>
        <span className="text-gray-300">|</span>
        <Link href="/terms" className="hover:text-blue-600 hover:underline transition">
          Terms of Service
        </Link>
        <span className="text-gray-300">|</span>
        <a 
          href="mailto:support@bangbuy.app" 
          className="hover:text-blue-600 hover:underline transition"
        >
          support@bangbuy.app
        </a>
      </div>
      
      {/* 版權資訊 */}
      <p className="text-gray-400">
        © {new Date().getFullYear()} BangBuy. All rights reserved.
      </p>
    </div>
  );
}

















