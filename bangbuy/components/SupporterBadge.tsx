'use client';

/**
 * 共用的 Supporter 徽章組件
 * 統一樣式，避免不一致
 */

interface SupporterBadgeProps {
  /** 尺寸：'small' (20-24px) 或 'default' (稍大) */
  size?: 'small' | 'default';
  /** 是否可點擊（點擊導向 /supporter/checkout） */
  clickable?: boolean;
  /** 自訂 className */
  className?: string;
}

export default function SupporterBadge({ 
  size = 'default', 
  clickable = false,
  className = '' 
}: SupporterBadgeProps) {
  const baseClasses = 'inline-flex items-center gap-0.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-full shrink-0';
  
  const sizeClasses = size === 'small' 
    ? 'px-1.5 py-0.5 text-[10px] h-[18px]' 
    : 'px-2 py-1 text-xs h-[20px]';
  
  const clickableClasses = clickable 
    ? 'cursor-pointer hover:from-purple-600 hover:to-pink-600 transition-colors' 
    : '';
  
  const content = (
    <>
      <span>⭐</span>
      <span>Supporter</span>
    </>
  );

  if (clickable) {
    return (
      <a
        href="/supporter/checkout"
        onClick={(e) => {
          // 確保使用 full reload
          e.preventDefault();
          window.location.assign('/supporter/checkout');
        }}
        className={`${baseClasses} ${sizeClasses} ${clickableClasses} ${className}`}
        title="成為 Supporter"
      >
        {content}
      </a>
    );
  }

  return (
    <span className={`${baseClasses} ${sizeClasses} ${className}`} title="Supporter">
      {content}
    </span>
  );
}
