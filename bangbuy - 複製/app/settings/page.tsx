import { redirect } from 'next/navigation';

/**
 * Settings 設定頁面
 * 🚫 暫時停用（設定功能下線）
 * 直接 redirect 到首頁
 */
export default function SettingsPage() {
  // 設定功能暫時停用，redirect 到首頁
  redirect('/');
}
