/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // 開發時忽略 TypeScript 錯誤，建議在生產環境移除
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'i.pravatar.cc',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
    ],
    // 如果需要支援所有域名（開發/測試用），取消下面註解
    // unoptimized: true,
  },
};

export default nextConfig;