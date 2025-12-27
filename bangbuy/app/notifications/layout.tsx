import type { Metadata } from 'next';

/**
 * 🔐 Notifications Layout
 * 
 * 禁止搜尋引擎索引通知頁
 */
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
  },
};

export default function NotificationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

