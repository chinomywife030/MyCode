import type { Metadata } from 'next';

/**
 * 🔐 Dashboard Layout
 * 
 * 禁止搜尋引擎索引所有 dashboard 頁面
 */
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
  },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

