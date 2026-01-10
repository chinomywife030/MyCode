-- ============================================
-- 修復 conversations 表：新增 last_message_at 和 last_message_preview
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

-- 3. 確保 updated_at 欄位存在（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'conversations' 
      AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.conversations 
    ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    
    -- 為現有資料設置預設值
    UPDATE public.conversations
    SET updated_at = COALESCE(created_at, NOW())
    WHERE updated_at IS NULL;
    
    RAISE NOTICE '✅ 已新增 updated_at 欄位';
  ELSE
    RAISE NOTICE 'ℹ️ updated_at 欄位已存在';
  END IF;
END $$;

-- 4. 驗證欄位
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'conversations'
  AND column_name IN ('last_message_at', 'last_message_preview', 'updated_at')
ORDER BY column_name;

-- 5. 顯示完整的 conversations 表結構
SELECT 
  '✅ conversations 表結構確認完成' AS status,
  COUNT(*) FILTER (WHERE column_name = 'last_message_at') AS has_last_message_at,
  COUNT(*) FILTER (WHERE column_name = 'last_message_preview') AS has_last_message_preview,
  COUNT(*) FILTER (WHERE column_name = 'updated_at') AS has_updated_at
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'conversations';





