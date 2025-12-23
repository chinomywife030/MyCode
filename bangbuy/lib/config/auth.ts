/**
 * 🔐 Auth 相關配置
 */

export const AUTH_CONFIG = {
  /**
   * Email 驗證信重新寄送冷卻時間（秒）
   * 與 Supabase SMTP "Minimum interval per user" 一致
   */
  RESEND_COOLDOWN_SECONDS: 60,
  
  /**
   * localStorage key prefix
   */
  STORAGE_PREFIX: 'bb_',
  
  /**
   * 驗證信重新寄送冷卻 key
   * @param email 使用者 email
   */
  getResendCooldownKey: (email: string) => {
    return `bb_resend_email_cooldown_until:${email}`;
  },
} as const;








