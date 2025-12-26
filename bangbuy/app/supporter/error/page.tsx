import { notFound } from 'next/navigation';

/**
 * Supporter Error 頁面
 * 🚫 暫時停用（Supporter 功能下線）
 */
export default function SupporterErrorPage() {
  // Supporter 功能暫時下線，返回 404
  notFound();
}
