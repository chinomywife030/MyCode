import { router } from 'expo-router';
import { getCurrentUser } from './auth';

/**
 * 導航到指定路由，如果需要登入則先跳轉到登入頁
 * @param route 目標路由（例如：/wish/123）
 * @param requireAuth 是否需要登入（默認 true）
 */
export async function navigateToRoute(
  route: string,
  requireAuth: boolean = true
): Promise<void> {
  try {
    // 檢查是否需要登入
    if (requireAuth) {
      const user = await getCurrentUser();
      if (!user) {
        // 未登入，跳轉到登入頁並保存目標路由
        const encodedRoute = encodeURIComponent(route);
        router.push(`/login?next=${encodedRoute}`);
        return;
      }
    }

    // 已登入或不需要登入，直接導航
    router.push(route as any);
  } catch (error) {
    console.error('[navigateToRoute] Error:', error);
    // 發生錯誤時，至少嘗試導航到首頁
    router.push('/');
  }
}

/**
 * 從登入頁獲取 next 參數並導航
 * @param nextRoute 目標路由（從 URL 參數獲取）
 */
export function navigateAfterLogin(nextRoute?: string | null): void {
  try {
    if (nextRoute && nextRoute.trim()) {
      const decodedRoute = decodeURIComponent(nextRoute.trim());
      // 驗證路由格式（基本安全檢查）
      if (decodedRoute.startsWith('/') && !decodedRoute.startsWith('//')) {
        router.replace(decodedRoute as any);
        return;
      }
    }
    // 沒有 next 參數或格式無效，導航到首頁
    router.replace('/');
  } catch (error) {
    console.error('[navigateAfterLogin] Error:', error);
    router.replace('/');
  }
}






