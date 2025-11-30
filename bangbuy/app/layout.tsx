import './globals.css';
import { LanguageProvider } from '@/components/LanguageProvider'; // 引入管家

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
        {/* 把整個網站包在管家裡面 */}
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}