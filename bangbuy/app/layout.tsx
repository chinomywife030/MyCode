import './globals.css';
import Providers from '@/components/Providers';
import BottomNav from '@/components/BottomNav';
import Footer from '@/components/Footer';
import CookieBanner from '@/components/CookieBanner';
import GA4 from '@/components/analytics/GA4';
import AdSenseVerification from '@/components/analytics/AdSenseVerification';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  // 🔐 metadataBase 必須設定，讓相對路徑自動轉為絕對 URL
  metadataBase: new URL('https://bangbuy.app'),
  
  // 基本資訊
  title: {
    default: 'BangBuy｜留學生代購需求媒合',
    template: '%s | BangBuy 幫買',
  },
  description: 'BangBuy 幫你把「想買」與「在國外的人」快速媒合。發布需求、私訊詢問、報價接單，流程清楚、安全透明。',
  applicationName: 'BangBuy',
  authors: [{ name: 'BangBuy Team' }],
  keywords: ['代購', '留學生', '跨境購物', 'BangBuy', '幫買', '海外代購', '日本代購', '韓國代購', '美國代購'],
  
  // 🖼️ Icons（favicon 會自動從 app/icon.ico 讀取）
  icons: {
    icon: [
      { url: '/icon.ico', sizes: 'any' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  
  // 🔗 Canonical URL（防止 www 和 non-www 重複內容）
  alternates: {
    canonical: 'https://bangbuy.app',
  },
  
  // 📱 Open Graph（Facebook, LINE, Discord 等）
  openGraph: {
    type: 'website',
    url: 'https://bangbuy.app',
    title: 'BangBuy｜留學生代購需求媒合',
    description: 'BangBuy 幫你把「想買」與「在國外的人」快速媒合。發布需求、私訊詢問、報價接單，流程清楚、安全透明。',
    siteName: 'BangBuy 幫買',
    locale: 'zh_TW',
    images: [
      {
        url: '/og.jpg',  // 使用相對路徑，metadataBase 會自動轉為絕對 URL
        width: 1200,
        height: 630,
        alt: 'BangBuy｜留學生代購需求媒合',
      },
    ],
  },
  
  // 🐦 Twitter Card
  twitter: {
    card: 'summary_large_image',
    title: 'BangBuy｜留學生代購需求媒合',
    description: 'BangBuy 幫你把「想買」與「在國外的人」快速媒合。發布需求、私訊詢問、報價接單，流程清楚、安全透明。',
    images: ['/og.jpg'],
  },
  
  // 其他
  other: {
    'contact': 'bangbuy.contact@gmail.com',
  },
  
  // 🤖 Robots
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh">
      <head>
        {/* 🔐 Google AdSense 網站驗證（僅 production） */}
        <AdSenseVerification />
      </head>
      <body className="flex flex-col min-h-screen">
        {/* 📊 Google Analytics 4 */}
        <GA4 />
        
        <Providers>
          {/* 主內容區 */}
          <main className="flex-1">
            {children}
          </main>
          
          {/* 🦶 全站 Footer（桌機版可見） */}
          <Footer />
          
          {/* 全局底部導航（僅 mobile） */}
          <BottomNav />
          
          {/* 🍪 Cookie Banner（首次進站） */}
          <CookieBanner />
        </Providers>
      </body>
    </html>
  );
}
