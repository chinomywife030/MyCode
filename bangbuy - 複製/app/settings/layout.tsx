import type { Metadata } from 'next';

/**
 * 🔐 Settings Layout
 * 
 * 禁止搜尋引擎索引設定頁
 */
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
  },
};

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

