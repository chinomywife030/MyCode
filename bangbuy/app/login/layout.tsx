import type { Metadata } from 'next';

// 🔐 禁止搜尋引擎索引登入頁
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}

















