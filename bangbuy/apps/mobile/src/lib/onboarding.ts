import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_KEY = 'bangbuy_has_seen_onboarding_v1';

/**
 * 檢查是否為首次啟動（未看過 Onboarding）
 * @returns true 表示首次啟動，需要顯示 Onboarding
 */
export async function checkIfFirstLaunch(): Promise<boolean> {
  try {
    const hasSeen = await AsyncStorage.getItem(ONBOARDING_KEY);
    return hasSeen !== 'true';
  } catch (error) {
    console.error('[onboarding] Error checking first launch:', error);
    // 發生錯誤時，預設顯示 Onboarding（安全起見）
    return true;
  }
}

/**
 * 標記已看過 Onboarding
 */
export async function setHasSeenOnboarding(): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
  } catch (error) {
    console.error('[onboarding] Error setting has seen onboarding:', error);
    throw error;
  }
}
