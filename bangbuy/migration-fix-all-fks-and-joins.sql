-- ============================================
-- 一次性修復所有 FK 關聯（確保 JOIN 不再 400）
-- 在 Supabase SQL Editor 執行
-- ============================================

-- 1. 檢查並建立 trips -> profiles FK
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'trips_shopper_id_fkey'
  ) THEN
    ALTER TABLE public.trips
      ADD CONSTRAINT trips_shopper_id_fkey
      FOREIGN KEY (shopper_id) REFERENCES public.profiles(id)
      ON DELETE CASCADE;
    RAISE NOTICE 'Created trips_shopper_id_fkey';
  ELSE
    RAISE NOTICE 'trips_shopper_id_fkey already exists';
  END IF;
END $$;

-- 2. 檢查並建立 wish_requests -> profiles FK
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'wish_requests_buyer_id_fkey'
  ) THEN
    ALTER TABLE public.wish_requests
      ADD CONSTRAINT wish_requests_buyer_id_fkey
      FOREIGN KEY (buyer_id) REFERENCES public.profiles(id)
      ON DELETE CASCADE;
    RAISE NOTICE 'Created wish_requests_buyer_id_fkey';
  ELSE
    RAISE NOTICE 'wish_requests_buyer_id_fkey already exists';
  END IF;
END $$;

-- 3. 檢查並建立 favorites -> profiles FK
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'favorites_user_id_fkey'
  ) THEN
    ALTER TABLE public.favorites
      ADD CONSTRAINT favorites_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id)
      ON DELETE CASCADE;
    RAISE NOTICE 'Created favorites_user_id_fkey';
  ELSE
    RAISE NOTICE 'favorites_user_id_fkey already exists';
  END IF;
END $$;

-- 4. 檢查並建立 favorites -> wish_requests FK
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'favorites_wish_id_fkey'
  ) THEN
    ALTER TABLE public.favorites
      ADD CONSTRAINT favorites_wish_id_fkey
      FOREIGN KEY (wish_id) REFERENCES public.wish_requests(id)
      ON DELETE CASCADE;
    RAISE NOTICE 'Created favorites_wish_id_fkey';
  ELSE
    RAISE NOTICE 'favorites_wish_id_fkey already exists';
  END IF;
END $$;

-- 5. 驗證所有 FK 已建立
SELECT 
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  confrelid::regclass AS referenced_table
FROM pg_constraint
WHERE contype = 'f'
  AND conrelid::regclass::text IN ('trips', 'wish_requests', 'favorites')
ORDER BY conname;

SELECT 'Migration completed: All FKs verified' AS status;



