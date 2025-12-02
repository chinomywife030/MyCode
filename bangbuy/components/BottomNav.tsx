'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUserMode } from '@/components/UserModeProvider';

export default function BottomNav() {
  const pathname = usePathname();
  const { mode } = useUserMode();

  // 判斷按鈕是否激活
  const isActive = (path: string) => pathname === path ? 'text-blue-600' : 'text-gray-400';

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 pb-safe md:hidden">
      <div className="flex justify-around items-center h-16">
        
        <Link href="/" className={`flex flex-col items-center gap-1 p-2 ${isActive('/')}`}>
          <svg xmlns="http://www.w3.org/2000/svg" fill={pathname === '/' ? 'currentColor' : 'none'} viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
          </svg>
          <span className="text-[10px] font-bold">首頁</span>
        </Link>

        {/* 計算機 - 特別強調 */}
        <Link href="/calculator" className="flex flex-col items-center gap-1 p-2 -mt-6">
          <div className="bg-blue-600 text-white p-3 rounded-full shadow-lg shadow-blue-200 border-4 border-white">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-7 h-7">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V18zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V13.5zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V18zm2.504-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zm0 2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V18zm2.498-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zM8.25 6h7.5a2.25 2.25 0 012.25 2.25v12a2.25 2.25 0 01-2.25 2.25H8.25A2.25 2.25 0 016 20.25V8.25A2.25 2.25 0 018.25 6z" />
            </svg>
          </div>
          <span className="text-[10px] font-bold text-blue-600">試算</span>
        </Link>

        <Link href="/create" className={`flex flex-col items-center gap-1 p-2 ${isActive('/create')}`}>
          <svg xmlns="http://www.w3.org/2000/svg" fill={pathname === '/create' ? 'currentColor' : 'none'} viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          <span className="text-[10px] font-bold">{mode === 'requester' ? '許願' : '接單'}</span>
        </Link>
        
        <Link href="/chat" className={`flex flex-col items-center gap-1 p-2 ${isActive('/chat')}`}>
          <svg xmlns="http://www.w3.org/2000/svg" fill={pathname === '/chat' ? 'currentColor' : 'none'} viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
          </svg>
          <span className="text-[10px] font-bold">訊息</span>
        </Link>

        <Link href="/dashboard" className={`flex flex-col items-center gap-1 p-2 ${isActive('/dashboard')}`}>
          <svg xmlns="http://www.w3.org/2000/svg" fill={pathname === '/dashboard' ? 'currentColor' : 'none'} viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
          <span className="text-[10px] font-bold">我的</span>
        </Link>
      </div>
    </div>
  );
}