-- ============================================
-- 🔧 修復 device_tokens 表中 user_id 為 NULL 的問題
-- ============================================

-- 方法 1：查看所有 user_id 為 NULL 的 tokens
SELECT 
  id,
  user_id,
  platform,
  LEFT(fcm_token, 30) || '...' as token_preview,
  device_id,
  last_seen_at,
  created_at
FROM device_tokens
WHERE user_id IS NULL
ORDER BY last_seen_at DESC;

-- 方法 2：手動更新特定 token 的 user_id
-- 替換 <TOKEN_ID> 為實際的 token id
-- 替換 <USER_ID> 為實際的用戶 ID（例如：9c657fb7-f99e-4b16-b617-553cc869b639）
UPDATE device_tokens
SET user_id = '<USER_ID>'
WHERE id = '<TOKEN_ID>';

-- 方法 3：批量更新所有 NULL 的 user_id（如果確定都是同一個用戶）
-- ⚠️ 謹慎使用：確保所有 NULL 的 token 都屬於同一個用戶
-- UPDATE device_tokens
-- SET user_id = '<USER_ID>'
-- WHERE user_id IS NULL;

-- 方法 4：刪除所有 user_id 為 NULL 的舊 token（讓 App 重新註冊）
-- ⚠️ 謹慎使用：這會刪除所有未綁定用戶的 token
-- DELETE FROM device_tokens
-- WHERE user_id IS NULL;








