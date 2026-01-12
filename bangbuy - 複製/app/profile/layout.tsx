import type { Metadata } from 'next';

/**
 * 🔐 Profile Layout
 * 
 * 禁止搜尋引擎索引個人檔案頁（隱私保護）
 */
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
  },
};

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

