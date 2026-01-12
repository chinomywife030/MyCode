import type { Metadata } from 'next';

/**
 * 🔐 Chat Layout
 * 
 * 禁止搜尋引擎索引聊天頁
 */
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
  },
};

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

