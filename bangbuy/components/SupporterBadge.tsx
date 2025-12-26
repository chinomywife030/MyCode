'use client';

/**
 * 共用的 Supporter 徽章組件
 * 🚫 暫時停用（Supporter 功能下線）
 */

interface SupporterBadgeProps {
  size?: 'small' | 'default';
  clickable?: boolean;
  className?: string;
}

export default function SupporterBadge({ 
  size = 'default', 
  clickable = false,
  className = '' 
}: SupporterBadgeProps) {
  // Supporter 功能暫時下線，不顯示任何內容
  return null;
}
