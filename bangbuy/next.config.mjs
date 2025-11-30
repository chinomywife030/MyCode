/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // 忽略 TypeScript 錯誤
    ignoreBuildErrors: true,
  },
  eslint: {
    // 忽略 ESLint 錯誤
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;