import type { Metadata } from 'next';

// 🔐 禁止搜尋引擎索引 Debug 頁面
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function DebugEnvLayout({ children }: { children: React.ReactNode }) {
  return children;
}



