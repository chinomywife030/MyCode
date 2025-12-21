import './globals.css';
import Providers from '@/components/Providers';
import BottomNav from '@/components/BottomNav';
import Footer from '@/components/Footer';
import CookieBanner from '@/components/CookieBanner';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  // 🔐 metadataBase 必須設定，讓相對路徑自動轉為絕對 URL
  metadataBase: new URL('https://bangbuy.app'),
  
  // 基本資訊
  title: {
    default: 'BangBuy 幫買 - 留學生跨境代購平台',
    template: '%s | BangBuy 幫買',
  },
  description: '全球留學生代購媒合平台，想買什麼都有人幫你帶！發布需求、媒合代購、安心交易。',
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
    title: 'BangBuy 幫買 - 留學生跨境代購平台',
    description: '全球留學生代購媒合平台，想買什麼都有人幫你帶！發布需求、媒合代購、安心交易。',
    siteName: 'BangBuy 幫買',
    locale: 'zh_TW',
    images: [
      {
        url: '/og.jpg',  // 使用相對路徑，metadataBase 會自動轉為絕對 URL
        width: 1200,
        height: 630,
        alt: 'BangBuy 幫買 - 留學生跨境代購平台',
      },
    ],
  },
  
  // 🐦 Twitter Card
  twitter: {
    card: 'summary_large_image',
    title: 'BangBuy 幫買 - 留學生跨境代購平台',
    description: '全球留學生代購媒合平台，想買什麼都有人幫你帶！',
    images: ['/og.jpg'],
  },
  
  // 其他
  other: {
    'contact': 'support@bangbuy.app',
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
      <body className="flex flex-col min-h-screen">
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
