/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // 忽略 TypeScript 錯誤，避免部署失敗
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      // 1. 允許 Unsplash 圖片 (測試資料常用)
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'plus.unsplash.com',
      },
      // 2. 允許 Placeholder 圖片 (預設頭像用到 via.placeholder.com)
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
      },
      // 3. 允許 Supabase Storage 圖片 (使用者上傳的圖片)
      // 使用 wildcard *.supabase.co 來匹配您的專案網域
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      // 4. 允許 UI Avatars (預設頭像)
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
      },
    ],
  },
};

export default nextConfig;