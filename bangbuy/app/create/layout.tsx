import type { Metadata } from 'next';

/**
 * 🔐 Create Layout
 * 
 * 禁止搜尋引擎索引創建頁（需要登入）
 */
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
  },
};

export default function CreateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

