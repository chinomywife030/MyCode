-- ============================================
-- 📊 notifications 表結構與 RLS 狀態診斷
-- 請將執行結果完整貼回，以便提供正確的 RLS policies
-- ============================================

SET search_path = public;

-- ============================================
-- 1. 表的基本資訊
-- ============================================
SELECT 
  '📋 表基本資訊' AS section;

SELECT 
  schemaname,
  tablename,
  tableowner,
  hasindexes,
  hasrules,
  hastriggers
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'notifications';

-- ============================================
-- 2. 所有欄位名稱與型別
-- ============================================
SELECT 
  '📝 欄位清單' AS section;

SELECT 
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default,
  ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'notifications'
ORDER BY ordinal_position;

-- ============================================
-- 3. 主鍵（Primary Key）
-- ============================================
SELECT 
  '🔑 主鍵資訊' AS section;

SELECT
  kcu.column_name,
  kcu.ordinal_position,
  tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'PRIMARY KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name = 'notifications';

-- ============================================
-- 4. 外鍵（Foreign Keys）
-- ============================================
SELECT 
  '🔗 外鍵資訊' AS section;

SELECT
  tc.constraint_name,
  kcu.column_name,
  ccu.table_schema AS foreign_table_schema,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name = 'notifications';

-- ============================================
-- 5. 索引（Indexes）
-- ============================================
SELECT 
  '📇 索引清單' AS section;

SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
  AND tablename = 'notifications'
ORDER BY indexname;

-- ============================================
-- 6. RLS 狀態（Row Level Security）
-- ============================================
SELECT 
  '🔒 RLS 狀態' AS section;

SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'notifications';

-- 從 pg_class 確認 RLS 狀態（更準確）
SELECT
  relname AS table_name,
  relrowsecurity AS rls_enabled,
  relforcerowsecurity AS rls_forced
FROM pg_class
WHERE relname = 'notifications'
  AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- ============================================
-- 7. 現有的 RLS Policies
-- ============================================
SELECT 
  '🛡️ 現有 RLS Policies' AS section;

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd AS command_type,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'notifications'
ORDER BY policyname;

-- 如果沒有 policies，顯示提示
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'notifications';
  
  IF policy_count = 0 THEN
    RAISE NOTICE '⚠️ 目前沒有設定任何 RLS policies';
  ELSE
    RAISE NOTICE '✅ 目前有 % 個 RLS policies', policy_count;
  END IF;
END $$;

-- ============================================
-- 8. 表權限（Grants）
-- ============================================
SELECT 
  '👥 表權限' AS section;

SELECT
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.table_privileges
WHERE table_schema = 'public' 
  AND table_name = 'notifications'
ORDER BY grantee, privilege_type;

-- ============================================
-- 9. 範例資料（前 3 筆，僅顯示欄位名稱，不顯示內容）
-- ============================================
SELECT 
  '📊 範例資料結構（前 3 筆）' AS section;

-- 只顯示欄位名稱，不顯示實際內容（保護隱私）
SELECT 
  '欄位名稱: ' || string_agg(column_name, ', ' ORDER BY ordinal_position) AS column_list
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'notifications';

-- 顯示實際資料筆數
SELECT 
  COUNT(*) AS total_rows
FROM notifications;

-- ============================================
-- 10. 可能的收件者欄位候選（根據命名慣例推測）
-- ============================================
SELECT 
  '🔍 可能的收件者欄位候選' AS section;

SELECT 
  column_name,
  data_type,
  CASE 
    WHEN column_name ILIKE '%user%' OR column_name ILIKE '%recipient%' OR column_name ILIKE '%owner%' THEN '✅ 可能是收件者欄位'
    ELSE '❓ 其他欄位'
  END AS suggestion
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'notifications'
  AND (
    column_name ILIKE '%user%' 
    OR column_name ILIKE '%recipient%' 
    OR column_name ILIKE '%owner%'
    OR column_name ILIKE '%target%'
  )
ORDER BY 
  CASE 
    WHEN column_name ILIKE '%user_id%' THEN 1
    WHEN column_name ILIKE '%recipient_id%' THEN 2
    WHEN column_name ILIKE '%owner_id%' THEN 3
    ELSE 4
  END;

-- ============================================
-- 11. 可能的已讀欄位候選（根據命名慣例推測）
-- ============================================
SELECT 
  '🔍 可能的已讀欄位候選' AS section;

SELECT 
  column_name,
  data_type,
  CASE 
    WHEN column_name ILIKE '%read%' OR column_name ILIKE '%seen%' THEN '✅ 可能是已讀欄位'
    ELSE '❓ 其他欄位'
  END AS suggestion
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'notifications'
  AND (
    column_name ILIKE '%read%' 
    OR column_name ILIKE '%seen%'
    OR column_name ILIKE '%viewed%'
  )
ORDER BY 
  CASE 
    WHEN column_name ILIKE '%is_read%' THEN 1
    WHEN column_name ILIKE '%read%' THEN 2
    WHEN column_name ILIKE '%seen%' THEN 3
    ELSE 4
  END;

-- ============================================
-- 完成提示
-- ============================================
SELECT 
  '✅ 診斷完成！請將以上所有結果完整貼回' AS final_message;



