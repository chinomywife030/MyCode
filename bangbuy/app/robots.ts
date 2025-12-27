import { MetadataRoute } from 'next';

/**
 * 🤖 Robots.txt Generator
 * 
 * 控制搜尋引擎爬蟲行為
 * - 允許索引首頁與公開頁
 * - 禁止索引私有頁面（dashboard, settings, messages 等）
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://bangbuy.app';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard',
          '/settings',
          '/messages',
          '/notifications',
          '/api',
          '/reset-password',
          '/forgot-password',
          '/login',
          '/verify-email',
          '/auth',
          '/chat',
          '/create',
          '/trips/create',
          '/profile',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: [
          '/dashboard',
          '/settings',
          '/messages',
          '/notifications',
          '/api',
          '/reset-password',
          '/forgot-password',
          '/login',
          '/verify-email',
          '/auth',
          '/chat',
          '/create',
          '/trips/create',
          '/profile',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

