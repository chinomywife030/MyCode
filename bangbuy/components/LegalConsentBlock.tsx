/**
 * 🔐 法務同意區塊組件
 * 
 * 用於註冊/登入頁面的條款同意 checkbox
 */

'use client';

import Link from 'next/link';
import { useState } from 'react';

interface LegalConsentBlockProps {
  mode: 'register' | 'login';
  checked: boolean;
  onChange: (checked: boolean) => void;
  showError?: boolean;
}

export default function LegalConsentBlock({
  mode,
  checked,
  onChange,
  showError = false,
}: LegalConsentBlockProps) {
  const isRegister = mode === 'register';

  // 統一使用純文字告知（不強制勾選）
  return (
    <div className="text-center py-2">
      <p className="text-xs text-gray-600 leading-relaxed">
        {isRegister ? '註冊' : '登入'}即表示您{isRegister ? '已閱讀並' : ''}同意
        <Link href="/terms" target="_blank" className="text-blue-600 hover:underline font-medium mx-1">
          《使用條款》
        </Link>
        {isRegister ? '、' : '與'}
        <Link href="/privacy" target="_blank" className="text-blue-600 hover:underline font-medium mx-1">
          《隱私權政策》
        </Link>
        {isRegister && (
          <>
            與
            <Link href="/disclaimer" target="_blank" className="text-blue-600 hover:underline font-medium mx-1">
              《免責聲明》
            </Link>
          </>
        )}
        。
      </p>
    </div>
  );
}

