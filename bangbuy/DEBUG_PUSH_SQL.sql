-- ============================================
-- 🔍 推送通知調試 SQL 查詢
-- 在 Supabase SQL Editor 中執行這些查詢來排查推送問題
-- ============================================

-- 1. 查看所有 device tokens（最近 20 個）
SELECT 
  id,
  user_id,
  platform,
  LEFT(fcm_token, 30) || '...' as token_preview,
  device_id,
  last_seen_at,
  created_at
FROM device_tokens
ORDER BY last_seen_at DESC
LIMIT 20;

-- 2. 查看特定用戶的 tokens（替換 <USER_ID> 為實際用戶 ID）
-- 例如：WHERE user_id = '9c657fb7-f99e-4b16-b617-553cc869b639'
SELECT 
  id,
  user_id,
  platform,
  LEFT(fcm_token, 30) || '...' as token_preview,
  device_id,
  last_seen_at,
  created_at
FROM device_tokens
WHERE user_id = '<USER_ID>'
ORDER BY last_seen_at DESC;

-- 3. 查看 user_id 為 NULL 的 tokens（未綁定用戶的 token）
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

-- 4. 查看最近的 wish_replies（檢查推送是否被觸發）
SELECT 
  id,
  wish_id,
  user_id,
  LEFT(message, 50) as message_preview,
  created_at
FROM wish_replies
ORDER BY created_at DESC
LIMIT 10;

-- 5. 查看最近的 wishes 和它們的 buyer_id
SELECT 
  id,
  title,
  buyer_id,
  created_at
FROM wish_requests
ORDER BY created_at DESC
LIMIT 10;

-- 6. 檢查特定 wish 的 owner（buyer_id）
SELECT 
  w.id as wish_id,
  w.title,
  w.buyer_id,
  COUNT(DISTINCT dt.id) as device_tokens_count
FROM wish_requests w
LEFT JOIN device_tokens dt ON dt.user_id = w.buyer_id
WHERE w.id = '<WISH_ID>'  -- 替換為實際的 wish ID
GROUP BY w.id, w.title, w.buyer_id;

-- 7. 統計每個用戶的 device token 數量
SELECT 
  user_id,
  COUNT(*) as token_count,
  MAX(last_seen_at) as last_seen,
  STRING_AGG(DISTINCT platform, ', ') as platforms
FROM device_tokens
WHERE user_id IS NOT NULL
GROUP BY user_id
ORDER BY token_count DESC;

-- 8. 檢查是否有 token 但 user_id 不匹配的情況
-- （這可能導致推送找不到用戶）
SELECT 
  dt.user_id,
  COUNT(*) as token_count,
  MAX(dt.last_seen_at) as last_seen
FROM device_tokens dt
LEFT JOIN profiles p ON p.id = dt.user_id
WHERE dt.user_id IS NOT NULL
  AND p.id IS NULL  -- user_id 存在但對應的 profile 不存在
GROUP BY dt.user_id;






