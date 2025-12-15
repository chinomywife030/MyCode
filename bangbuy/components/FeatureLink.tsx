'use client';

/**
 * 🔗 FeatureLink - 功能連結組件
 * 
 * 根據 feature flags 決定連結行為：
 * - 啟用：正常跳轉
 * - 禁用：顯示 toast 提示「即將推出」
 */

import Link from 'next/link';
import { ReactNode, MouseEvent } from 'react';
import { isFeatureEnabled, getFeatureKeyFromPath, FeatureKey } from '@/lib/featureFlags';
import { useToast } from '@/components/Toast';

interface FeatureLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  featureKey?: FeatureKey;
  onClick?: () => void;
  title?: string;
}

export default function FeatureLink({
  href,
  children,
  className = '',
  featureKey,
  onClick,
  title,
}: FeatureLinkProps) {
  const { showToast } = useToast();
  
  // 確定 feature key
  const key = featureKey || getFeatureKeyFromPath(href);
  const enabled = key ? isFeatureEnabled(key) : true;

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!enabled) {
      e.preventDefault();
      showToast('info', '此功能即將推出，敬請期待！', 2500);
      return;
    }
    onClick?.();
  };

  if (!enabled) {
    return (
      <a
        href="#"
        onClick={handleClick}
        className={`${className} cursor-not-allowed opacity-60`}
        title={title || '即將推出'}
      >
        {children}
        <span className="ml-1 text-[10px] text-gray-400">(即將推出)</span>
      </a>
    );
  }

  return (
    <Link href={href} className={className} onClick={onClick} title={title}>
      {children}
    </Link>
  );
}

// ============================================
// FeatureButton - 功能按鈕組件
// ============================================

interface FeatureButtonProps {
  featureKey: FeatureKey;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}

export function FeatureButton({
  featureKey,
  children,
  className = '',
  onClick,
  disabled = false,
}: FeatureButtonProps) {
  const { showToast } = useToast();
  const enabled = isFeatureEnabled(featureKey);

  const handleClick = () => {
    if (!enabled) {
      showToast('info', '此功能即將推出，敬請期待！', 2500);
      return;
    }
    onClick?.();
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || !enabled}
      className={`${className} ${!enabled ? 'cursor-not-allowed opacity-60' : ''}`}
      title={!enabled ? '即將推出' : undefined}
    >
      {children}
      {!enabled && <span className="ml-1 text-[10px]">(即將推出)</span>}
    </button>
  );
}

