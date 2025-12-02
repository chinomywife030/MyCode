import './globals.css';
import { LanguageProvider } from '@/components/LanguageProvider';
import { UserModeProvider } from '@/components/UserModeProvider';
import BottomNav from '@/components/BottomNav'; // 👈 1. 引入

export const metadata = {
  title: 'BangBuy 幫買',
  description: '留學生跨國代購平台',
  icons: {
    icon: '/icon.png', // 這裡改成你上次放的 icon.png (如果有的話)
  },
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
            <div className="pb-16 md:pb-0"> {/* 👈 2. 增加底部內距，避免內容被導覽列擋住 */}
              {children}
            </div>
            <BottomNav /> {/* 👈 3. 放置導覽列 */}
          </UserModeProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}