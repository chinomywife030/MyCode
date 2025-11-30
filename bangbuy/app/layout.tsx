import './globals.css';
import { LanguageProvider } from '@/components/LanguageProvider';
import { UserModeProvider } from '@/components/UserModeProvider'; // 1. 引入

export const metadata = {
  title: 'BangBuy 幫買',
  description: '留學生跨國代購平台',
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
          {/* 2. 包在這裡 */}
          <UserModeProvider>
            {children}
          </UserModeProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}