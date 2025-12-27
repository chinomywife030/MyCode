import type { Metadata } from 'next';

/**
 * 🔐 Trips Create Layout
 * 
 * 禁止搜尋引擎索引行程創建頁（需要登入）
 */
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
  },
};

export default function TripsCreateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

