-- ============================================
-- 📊 notifications 表結構與 RLS 狀態診斷（簡化版）
-- 請將所有查詢結果完整貼回
-- ============================================

SET search_path = public;

-- 1. 所有欄位名稱與型別
SELECT 
  '欄位清單' AS info_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'notifications'
ORDER BY ordinal_position;

-- 2. 主鍵
SELECT 
  '主鍵' AS info_type,
  kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'PRIMARY KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name = 'notifications';

-- 3. RLS 狀態
SELECT 
  'RLS狀態' AS info_type,
  relname AS table_name,
  relrowsecurity AS rls_enabled,
  relforcerowsecurity AS rls_forced
FROM pg_class
WHERE relname = 'notifications'
  AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 4. 現有的 RLS Policies
SELECT 
  '現有Policies' AS info_type,
  policyname,
  cmd AS command_type,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'notifications'
ORDER BY policyname;

-- 5. 表權限
SELECT 
  '表權限' AS info_type,
  grantee,
  privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public' 
  AND table_name = 'notifications'
ORDER BY grantee, privilege_type;





