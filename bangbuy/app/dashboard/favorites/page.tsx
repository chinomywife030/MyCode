import { redirect } from 'next/navigation';

/**
 * 收藏頁面
 * 🚫 暫時停用（MVP 先不上）
 * 直接 redirect 到首頁
 */
export default function MyFavoritesPage() {
  // 收藏功能暫時停用，redirect 到首頁
  redirect('/');
}
