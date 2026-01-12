import type { Metadata } from 'next';

// 🔐 禁止搜尋引擎索引 auth 相關頁面
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}



















