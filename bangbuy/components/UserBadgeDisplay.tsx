'use client';

import SupporterBadge from './SupporterBadge';

interface UserBadgeDisplayProps {
  displayName?: string | null;
  isSupporter?: boolean;
  avatarUrl?: string | null;
  showAvatar?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * 用戶名稱與徽章顯示組件
 * 用於 Header/Sidebar 等使用者區塊
 */
export default function UserBadgeDisplay({
  displayName,
  isSupporter = false,
  avatarUrl,
  showAvatar = true,
  size = 'md',
  className = '',
}: UserBadgeDisplayProps) {
  const nameDisplay = displayName || '使用者';

  const sizeStyles = {
    sm: {
      avatar: 'w-6 h-6',
      name: 'text-sm',
      gap: 'gap-1.5',
    },
    md: {
      avatar: 'w-8 h-8',
      name: 'text-base',
      gap: 'gap-2',
    },
    lg: {
      avatar: 'w-10 h-10',
      name: 'text-lg',
      gap: 'gap-3',
    },
  };

  const styles = sizeStyles[size];

  return (
    <div className={`flex items-center ${styles.gap} ${className}`}>
      {/* Avatar */}
      {showAvatar && (
        <div className={`${styles.avatar} rounded-full bg-gray-200 overflow-hidden flex-shrink-0`}>
          {avatarUrl ? (
            <img 
              src={avatarUrl} 
              alt={nameDisplay}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold">
              {nameDisplay.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      )}

      {/* Name + Badge */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`font-medium text-gray-900 ${styles.name}`}>
          {nameDisplay}
        </span>
        {isSupporter && (
          <SupporterBadge size={size === 'lg' ? 'md' : 'sm'} />
        )}
      </div>
    </div>
  );
}

