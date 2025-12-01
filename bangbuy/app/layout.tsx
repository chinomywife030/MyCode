import './globals.css';
import { LanguageProvider } from '@/components/LanguageProvider';
import { UserModeProvider } from '@/components/UserModeProvider';
import FloatingButton from '@/components/FloatingButton'; // 👈 1. 引入元件

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
          <UserModeProvider>
            {children}
            
            {/* 🔽 2. 放在這裡，就會浮在所有頁面的最上面 */}
            <FloatingButton />
            
          </UserModeProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}