import type { Metadata } from 'next';

// 🔐 禁止搜尋引擎索引 Email 驗證頁
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function VerifyEmailLayout({ children }: { children: React.ReactNode }) {
  return children;
}




