import './globals.css';
import { LanguageProvider } from '@/components/LanguageProvider';
import { UserModeProvider } from '@/components/UserModeProvider';
import BottomNav from '@/components/BottomNav';

export const metadata = {
  title: 'BangBuy 幫買',
  description: '留學生跨境代購平台',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh">
      <body>
        <LanguageProvider>
          <UserModeProvider>
            {children}
            {/* 全局底部導航 - 在所有頁面顯示（僅 mobile） */}
            <BottomNav />
          </UserModeProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
