import type { Metadata } from 'next';

// 🔐 禁止搜尋引擎索引忘記密碼頁
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}

















