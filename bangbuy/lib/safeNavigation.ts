/**
 * 🛡️ 路由參數驗證與安全導航
 * 
 * 目的：
 * 1. 所有跳轉前驗證必要參數
 * 2. 參數異常時不進入目標頁
 * 3. 導回安全頁並提示錯誤
 */

'use client';

import { useRouter } from 'next/navigation';
import { logError } from '@/lib/errorLogger';

// UUID 格式驗證
export function isValidUUID(uuid: string | null | undefined): boolean {
  if (!uuid) return false;
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  // 排除全 0 UUID
  if (uuid === '00000000-0000-0000-0000-000000000000') return false;
  
  // 排除明顯錯誤的值
  if (uuid === 'null' || uuid === 'undefined') return false;
  
  return uuidRegex.test(uuid);
}

// 🔐 來源上下文類型
interface ChatSource {
  type: 'wish_request' | 'trip' | 'listing' | 'direct';
  id?: string;
  title?: string;
}

// 安全的導航到聊天頁面
export function useSafeNavigate() {
  const router = useRouter();

  const navigateToChat = (
    targetUserId: string | null | undefined, 
    context?: string,
    source?: ChatSource
  ) => {
    console.log(`[SafeNavigate] 嘗試導航到聊天頁面`);
    console.log(`[SafeNavigate] Context:`, context);
    console.log(`[SafeNavigate] Target User ID:`, targetUserId);
    console.log(`[SafeNavigate] Source:`, source);

    if (!isValidUUID(targetUserId)) {
      logError(new Error('Invalid target user ID'), {
        page: 'SafeNavigate',
        action: 'navigateToChat',
        severity: 'warning',
        metadata: { targetUserId, context },
      });

      alert('無法開啟聊天：目標用戶 ID 無效\n請返回重試或聯繫客服');
      console.error('[SafeNavigate] 無效的 targetUserId:', targetUserId);
      return false;
    }

    // 🔐 P0-2：構建包含來源上下文的 URL
    let chatUrl = `/chat?target=${targetUserId}`;
    if (source) {
      chatUrl += `&source_type=${source.type}`;
      if (source.id) chatUrl += `&source_id=${source.id}`;
      if (source.title) chatUrl += `&source_title=${encodeURIComponent(source.title)}`;
    }

    console.log('[SafeNavigate] ✅ 驗證通過，導航到聊天頁面');
    router.push(chatUrl);
    return true;
  };

  const navigateToProfile = (profileId: string | null | undefined) => {
    if (!isValidUUID(profileId)) {
      alert('無法開啟個人頁面：ID 無效');
      return false;
    }

    router.push(`/profile/${profileId}`);
    return true;
  };

  const navigateToWish = (wishId: string | null | undefined) => {
    if (!isValidUUID(wishId)) {
      alert('無法開啟願望詳情：ID 無效');
      return false;
    }

    router.push(`/wish/${wishId}`);
    return true;
  };

  const safeBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  };

  return {
    navigateToChat,
    navigateToProfile,
    navigateToWish,
    safeBack,
    router, // 保留原始 router 用於其他導航
  };
}

// 驗證查詢參數
export function validateQueryParam(
  param: string | null | undefined,
  paramName: string,
  validator?: (value: string) => boolean
): string | null {
  if (!param) {
    console.warn(`[validateQueryParam] ${paramName} 為空`);
    return null;
  }

  if (validator && !validator(param)) {
    console.warn(`[validateQueryParam] ${paramName} 驗證失敗:`, param);
    logError(new Error(`Invalid query parameter: ${paramName}`), {
      page: 'validateQueryParam',
      severity: 'warning',
      metadata: { paramName, paramValue: param },
    });
    return null;
  }

  return param;
}

