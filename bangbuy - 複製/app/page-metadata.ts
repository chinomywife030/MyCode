import type { Metadata } from 'next';

/**
 * 🏠 首頁 Metadata
 * 
 * 確保首頁可以被搜尋引擎索引
 */
export const homeMetadata: Metadata = {
  title: 'BangBuy｜留學生代購需求媒合',
  description: 'BangBuy 幫你把「想買」與「在國外的人」快速媒合。發布需求、私訊詢問、報價接單，流程清楚、安全透明。',
  alternates: {
    canonical: 'https://bangbuy.app',
  },
  openGraph: {
    type: 'website',
    url: 'https://bangbuy.app',
    title: 'BangBuy｜留學生代購需求媒合',
    description: 'BangBuy 幫你把「想買」與「在國外的人」快速媒合。發布需求、私訊詢問、報價接單，流程清楚、安全透明。',
    siteName: 'BangBuy 幫買',
    locale: 'zh_TW',
    images: [
      {
        url: '/og.jpg',
        width: 1200,
        height: 630,
        alt: 'BangBuy｜留學生代購需求媒合',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BangBuy｜留學生代購需求媒合',
    description: 'BangBuy 幫你把「想買」與「在國外的人」快速媒合。發布需求、私訊詢問、報價接單，流程清楚、安全透明。',
    images: ['/og.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

