import './globals.css';
import { LanguageProvider } from '@/components/LanguageProvider';
import { UserModeProvider } from '@/components/UserModeProvider';

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
          </UserModeProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
