import './globals.css';
import Providers from '@/components/Providers';
import BottomNav from '@/components/BottomNav';
import Footer from '@/components/Footer';
import CookieBanner from '@/components/CookieBanner';

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
      <body className="flex flex-col min-h-screen">
        <Providers>
          {/* 主內容區 */}
          <main className="flex-1">
            {children}
          </main>
          
          {/* 🦶 全站 Footer（桌機版可見） */}
          <Footer />
          
          {/* 全局底部導航（僅 mobile） */}
          <BottomNav />
          
          {/* 🍪 Cookie Banner（首次進站） */}
          <CookieBanner />
        </Providers>
      </body>
    </html>
  );
}
