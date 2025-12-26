-- ============================================
-- BangBuy 錯誤修復 Migration
-- 修復: 400/406/PGRST200/updated_at/RLS
-- 請在 Supabase SQL Editor 執行此腳本
-- ============================================

-- ============================================
-- Part 1: 確保所有關鍵表都有 updated_at 欄位
-- ============================================

-- 1.1 profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
UPDATE profiles SET updated_at = COALESCE(updated_at, created_at, NOW()) WHERE updated_at IS NULL;

-- 1.2 wish_requests
ALTER TABLE wish_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
UPDATE wish_requests SET updated_at = COALESCE(updated_at, created_at, NOW()) WHERE updated_at IS NULL;

-- 1.3 trips
ALTER TABLE trips ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
UPDATE trips SET updated_at = COALESCE(updated_at, created_at, NOW()) WHERE updated_at IS NULL;

-- 1.4 orders (如果存在)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders') THEN
    EXECUTE 'ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()';
    EXECUTE 'UPDATE orders SET updated_at = COALESCE(updated_at, created_at, NOW()) WHERE updated_at IS NULL';
  END IF;
END $$;

-- 1.5 offers (確保存在)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'offers') THEN
    EXECUTE 'ALTER TABLE offers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()';
    EXECUTE 'UPDATE offers SET updated_at = COALESCE(updated_at, created_at, NOW()) WHERE updated_at IS NULL';
  END IF;
END $$;

-- 1.6 conversations (如果存在)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversations') THEN
    EXECUTE 'ALTER TABLE conversations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()';
    EXECUTE 'UPDATE conversations SET updated_at = COALESCE(updated_at, created_at, NOW()) WHERE updated_at IS NULL';
  END IF;
END $$;

-- 1.7 favorites
ALTER TABLE favorites ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
UPDATE favorites SET updated_at = COALESCE(updated_at, created_at, NOW()) WHERE updated_at IS NULL;

-- 1.8 notifications (如果存在)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
    EXECUTE 'ALTER TABLE notifications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()';
    EXECUTE 'UPDATE notifications SET updated_at = COALESCE(updated_at, created_at, NOW()) WHERE updated_at IS NULL';
  END IF;
END $$;

-- ============================================
-- Part 2: 建立通用 updated_at trigger function
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Part 3: 為所有表建立 updated_at triggers
-- ============================================

-- 3.1 profiles
DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER trigger_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3.2 wish_requests
DROP TRIGGER IF EXISTS trigger_wish_requests_updated_at ON wish_requests;
DROP TRIGGER IF EXISTS update_wish_requests_updated_at ON wish_requests;
CREATE TRIGGER trigger_wish_requests_updated_at
  BEFORE UPDATE ON wish_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3.3 trips
DROP TRIGGER IF EXISTS trigger_trips_updated_at ON trips;
DROP TRIGGER IF EXISTS update_trips_updated_at ON trips;
CREATE TRIGGER trigger_trips_updated_at
  BEFORE UPDATE ON trips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3.4 offers (如果存在)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'offers') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trigger_offers_updated_at ON offers';
    EXECUTE 'DROP TRIGGER IF EXISTS update_offers_updated_at ON offers';
    EXECUTE 'CREATE TRIGGER trigger_offers_updated_at BEFORE UPDATE ON offers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()';
  END IF;
END $$;

-- 3.5 orders (如果存在)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trigger_orders_updated_at ON orders';
    EXECUTE 'DROP TRIGGER IF EXISTS update_orders_updated_at ON orders';
    EXECUTE 'CREATE TRIGGER trigger_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()';
  END IF;
END $$;

-- 3.6 conversations (如果存在)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversations') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trigger_conversations_updated_at ON conversations';
    EXECUTE 'DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations';
    EXECUTE 'CREATE TRIGGER trigger_conversations_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()';
  END IF;
END $$;

-- 3.7 favorites
DROP TRIGGER IF EXISTS trigger_favorites_updated_at ON favorites;
DROP TRIGGER IF EXISTS update_favorites_updated_at ON favorites;
CREATE TRIGGER trigger_favorites_updated_at
  BEFORE UPDATE ON favorites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3.8 notifications (如果存在)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trigger_notifications_updated_at ON notifications';
    EXECUTE 'DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications';
    EXECUTE 'CREATE TRIGGER trigger_notifications_updated_at BEFORE UPDATE ON notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()';
  END IF;
END $$;

-- ============================================
-- Part 4: 確保 notifications 表存在並有正確結構
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  body TEXT,
  href TEXT,
  source_type TEXT,
  source_id UUID,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  deep_link TEXT,
  data JSONB,
  dedupe_key TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_dedupe_key ON notifications(dedupe_key);

-- ============================================
-- Part 5: 設定 RLS Policies
-- ============================================

-- 5.1 啟用 RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 5.2 notifications policies
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- 5.3 確保 profiles 可以公開讀取（for join queries）
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

-- 5.4 確保 wish_requests 可以公開讀取
DROP POLICY IF EXISTS "Wishes are viewable by everyone" ON wish_requests;
CREATE POLICY "Wishes are viewable by everyone"
  ON wish_requests FOR SELECT
  USING (true);

-- 5.5 確保 trips 可以公開讀取
DROP POLICY IF EXISTS "Trips are viewable by everyone" ON trips;
CREATE POLICY "Trips are viewable by everyone"
  ON trips FOR SELECT
  USING (true);

-- ============================================
-- Part 6: 修復 offers 表 RLS（如果存在）
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'offers') THEN
    -- 啟用 RLS
    EXECUTE 'ALTER TABLE offers ENABLE ROW LEVEL SECURITY';
    
    -- 刪除舊 policies
    EXECUTE 'DROP POLICY IF EXISTS "Offers viewable by participants" ON offers';
    EXECUTE 'DROP POLICY IF EXISTS "Shoppers can create offers" ON offers';
    EXECUTE 'DROP POLICY IF EXISTS "Participants can update offers" ON offers';
    
    -- 建立新 policies
    -- SELECT: 買家和代購者都可以看到相關 offer
    EXECUTE $policy$
      CREATE POLICY "Offers viewable by participants"
        ON offers FOR SELECT
        USING (
          auth.uid() = shopper_id 
          OR auth.uid() IN (
            SELECT buyer_id FROM wish_requests WHERE id = offers.wish_id
          )
        )
    $policy$;
    
    -- INSERT: 登入用戶可以建立 offer
    EXECUTE $policy$
      CREATE POLICY "Shoppers can create offers"
        ON offers FOR INSERT
        WITH CHECK (auth.uid() = shopper_id)
    $policy$;
    
    -- UPDATE: 相關參與者可以更新
    EXECUTE $policy$
      CREATE POLICY "Participants can update offers"
        ON offers FOR UPDATE
        USING (
          auth.uid() = shopper_id 
          OR auth.uid() IN (
            SELECT buyer_id FROM wish_requests WHERE id = offers.wish_id
          )
        )
    $policy$;
  END IF;
END $$;

-- ============================================
-- Part 7: 建立必要的 RPC 函數
-- ============================================

-- 7.1 獲取未讀通知數量
CREATE OR REPLACE FUNCTION get_unread_notification_count()
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM notifications
    WHERE user_id = auth.uid()
      AND is_read = FALSE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7.2 獲取通知列表
CREATE OR REPLACE FUNCTION get_notifications(
  p_limit INTEGER DEFAULT 20,
  p_before TIMESTAMPTZ DEFAULT NULL
)
RETURNS SETOF notifications AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM notifications
  WHERE user_id = auth.uid()
    AND (p_before IS NULL OR created_at < p_before)
  ORDER BY created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7.3 標記單一通知為已讀
CREATE OR REPLACE FUNCTION mark_notification_read(p_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_unread_count INTEGER;
BEGIN
  UPDATE notifications
  SET is_read = TRUE, read_at = NOW()
  WHERE id = p_id AND user_id = v_user_id;
  
  SELECT COUNT(*)::INTEGER INTO v_unread_count
  FROM notifications
  WHERE user_id = v_user_id AND is_read = FALSE;
  
  RETURN jsonb_build_object('success', true, 'unread_count', v_unread_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7.4 標記所有通知為已讀
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS INTEGER AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  UPDATE notifications
  SET is_read = TRUE, read_at = NOW()
  WHERE user_id = v_user_id AND is_read = FALSE;
  
  RETURN 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Part 8: 驗證
-- ============================================

DO $$
DECLARE
  v_has_updated_at BOOLEAN;
  v_count INTEGER;
BEGIN
  -- 檢查 wish_requests
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wish_requests' AND column_name = 'updated_at'
  ) INTO v_has_updated_at;
  
  IF v_has_updated_at THEN
    RAISE NOTICE '✅ wish_requests.updated_at 欄位已存在';
  ELSE
    RAISE EXCEPTION '❌ wish_requests.updated_at 欄位不存在';
  END IF;
  
  -- 檢查 profiles
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'updated_at'
  ) INTO v_has_updated_at;
  
  IF v_has_updated_at THEN
    RAISE NOTICE '✅ profiles.updated_at 欄位已存在';
  ELSE
    RAISE EXCEPTION '❌ profiles.updated_at 欄位不存在';
  END IF;
  
  -- 檢查 triggers
  SELECT COUNT(*) INTO v_count
  FROM information_schema.triggers
  WHERE trigger_name LIKE '%updated_at%';
  
  RAISE NOTICE '✅ 已建立 % 個 updated_at triggers', v_count;
  
  -- 檢查 notifications 表
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'notifications'
  ) INTO v_has_updated_at;
  
  IF v_has_updated_at THEN
    RAISE NOTICE '✅ notifications 表已存在';
  ELSE
    RAISE EXCEPTION '❌ notifications 表不存在';
  END IF;
END $$;

-- 完成訊息
SELECT '✅ 所有錯誤修復完成！' AS status;
SELECT '請重新整理瀏覽器並測試首頁、需求詳情、報價列表、通知列表' AS next_step;











