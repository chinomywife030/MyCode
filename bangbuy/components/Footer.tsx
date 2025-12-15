/**
 * 🦶 全站 Footer 組件
 * 
 * 包含法務連結與版權資訊
 * 使用 FeatureLink 進行功能治理
 */

'use client';

import Link from 'next/link';
import FeatureLink from '@/components/FeatureLink';

export default function Footer() {
  return (
    <footer className="hidden md:block bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 主要連結區域 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
          {/* 關於我們 */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-3">關於 BangBuy</h3>
            <ul className="space-y-2">
              <li>
                <FeatureLink href="/" className="text-sm text-gray-600 hover:text-blue-600 transition">
                  首頁
                </FeatureLink>
              </li>
              <li>
                <FeatureLink href="/trips" className="text-sm text-gray-600 hover:text-blue-600 transition">
                  代購行程
                </FeatureLink>
              </li>
              <li>
                <FeatureLink href="/calculator" className="text-sm text-gray-600 hover:text-blue-600 transition">
                  匯率計算器
                </FeatureLink>
              </li>
            </ul>
          </div>

          {/* 會員功能 */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-3">會員功能</h3>
            <ul className="space-y-2">
              <li>
                <FeatureLink href="/dashboard" className="text-sm text-gray-600 hover:text-blue-600 transition">
                  會員中心
                </FeatureLink>
              </li>
              <li>
                <FeatureLink href="/create" className="text-sm text-gray-600 hover:text-blue-600 transition">
                  發布需求
                </FeatureLink>
              </li>
              <li>
                <FeatureLink href="/chat" className="text-sm text-gray-600 hover:text-blue-600 transition">
                  訊息中心
                </FeatureLink>
              </li>
            </ul>
          </div>

          {/* 🔐 法律聲明（Legal）- 必須存在 */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-3">法律聲明</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/terms" className="text-sm text-gray-600 hover:text-blue-600 transition">
                  使用條款
                </Link>
              </li>
              <li>
                <Link href="/disclaimer" className="text-sm text-gray-600 hover:text-blue-600 transition">
                  免責聲明
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-sm text-gray-600 hover:text-blue-600 transition">
                  隱私權政策
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="text-sm text-gray-600 hover:text-blue-600 transition">
                  Cookie 政策
                </Link>
              </li>
              <li>
                <Link href="/copyright" className="text-sm text-gray-600 hover:text-blue-600 transition">
                  智慧財產權
                </Link>
              </li>
            </ul>
          </div>

          {/* 聯絡我們 */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-3">聯絡我們</h3>
            <ul className="space-y-2">
              <li className="text-sm text-gray-600">
                透過平台聯絡功能
              </li>
            </ul>
          </div>
        </div>

        {/* 🔐 條款同意聲明（重要）*/}
        <div className="border-t border-gray-200 pt-6 mb-4">
          <p className="text-xs text-gray-600 text-center leading-relaxed">
            使用本平台即表示您同意
            <Link href="/terms" className="text-blue-600 hover:underline mx-1">使用條款</Link>
            、
            <Link href="/disclaimer" className="text-blue-600 hover:underline mx-1">免責聲明</Link>
            、
            <Link href="/privacy" className="text-blue-600 hover:underline mx-1">隱私權政策</Link>
            與
            <Link href="/cookies" className="text-blue-600 hover:underline mx-1">Cookie 政策</Link>
            。
          </p>
        </div>

        {/* 版權資訊 */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} BangBuy. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}


