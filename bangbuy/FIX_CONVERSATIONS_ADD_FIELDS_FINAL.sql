-- ============================================
-- 修復 conversations 表：新增 last_message_at 和 last_message_preview
-- 使用正規做法，確保字段正確添加
-- ============================================

SET search_path = public;

-- 1. 新增 last_message_at 欄位（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'conversations' 
      AND column_name = 'last_message_at'
  ) THEN
    ALTER TABLE public.conversations 
    ADD COLUMN last_message_at TIMESTAMPTZ DEFAULT NOW();
    
    -- 為現有資料設置預設值
    UPDATE public.conversations
    SET last_message_at = COALESCE(updated_at, created_at, NOW())
    WHERE last_message_at IS NULL;
    
    RAISE NOTICE '✅ 已新增 last_message_at 欄位';
  ELSE
    RAISE NOTICE 'ℹ️ last_message_at 欄位已存在';
  END IF;
END $$;

-- 2. 新增 last_message_preview 欄位（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'conversations' 
      AND column_name = 'last_message_preview'
  ) THEN
    ALTER TABLE public.conversations 
    ADD COLUMN last_message_preview TEXT;
    
    RAISE NOTICE '✅ 已新增 last_message_preview 欄位';
  ELSE
    RAISE NOTICE 'ℹ️ last_message_preview 欄位已存在';
  END IF;
END $$;

-- 3. 驗證欄位是否存在
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'conversations'
  AND column_name IN ('last_message_at', 'last_message_preview')
ORDER BY column_name;

-- 4. 確認結果
SELECT 
  CASE 
    WHEN COUNT(*) FILTER (WHERE column_name = 'last_message_at') > 0 
         AND COUNT(*) FILTER (WHERE column_name = 'last_message_preview') > 0
    THEN '✅ 所有必要欄位已存在'
    ELSE '❌ 仍有欄位缺失'
  END AS status,
  COUNT(*) FILTER (WHERE column_name = 'last_message_at') AS has_last_message_at,
  COUNT(*) FILTER (WHERE column_name = 'last_message_preview') AS has_last_message_preview
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'conversations';


