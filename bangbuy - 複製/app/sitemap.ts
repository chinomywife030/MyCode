/**
 * 🗺️ Sitemap Generator
 * 
 * 動態產生網站地圖供搜尋引擎索引
 */

import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://bangbuy.app';
  const lastModified = new Date();

  return [
    // 🏠 首頁（最重要，priority 最高）
    {
      url: baseUrl,
      lastModified,
      changeFrequency: 'daily',
      priority: 1.0,
    },

    // 📄 公開功能頁面
    {
      url: `${baseUrl}/trips`,
      lastModified,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/calculator`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/shipping-to-taiwan`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
    },

    // 📜 法務頁面（重要：必須被索引）
    {
      url: `${baseUrl}/privacy`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/disclaimer`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/cookies`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/copyright`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    
    // 🔐 注意：不包含以下私有頁面
    // - /dashboard, /settings, /messages, /notifications
    // - /login, /auth/*, /reset-password, /forgot-password
    // - /chat, /create, /trips/create, /profile/*
  ];
}

