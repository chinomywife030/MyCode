-- ============================================
-- 🔧 BangBuy Offer 系統完整修復
-- 修復 respond_to_offer RPC 400 錯誤
-- 執行時間：請在 Supabase SQL Editor 中一次貼上執行
-- ============================================

SET search_path = public;

-- ============================================
-- Part 1: 確保所有表都有 updated_at 欄位
-- ============================================

-- 1.1 wish_requests 表
ALTER TABLE wish_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
UPDATE wish_requests SET updated_at = created_at WHERE updated_at IS NULL;

-- 1.2 trips 表
ALTER TABLE trips ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
UPDATE trips SET updated_at = created_at WHERE updated_at IS NULL;

-- 1.3 orders 表（如果存在）
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders') THEN
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    UPDATE orders SET updated_at = created_at WHERE updated_at IS NULL;
  END IF;
END $$;

-- 1.4 確保 offers 表結構正確
CREATE TABLE IF NOT EXISTS offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wish_id UUID NOT NULL REFERENCES wish_requests(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  shopper_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'TWD',
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 確保 offers 有 updated_at
ALTER TABLE offers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
UPDATE offers SET updated_at = created_at WHERE updated_at IS NULL;

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

-- 3.1 wish_requests
DROP TRIGGER IF EXISTS update_wish_requests_updated_at ON wish_requests;
DROP TRIGGER IF EXISTS trigger_wish_requests_updated_at ON wish_requests;
CREATE TRIGGER trigger_wish_requests_updated_at
  BEFORE UPDATE ON wish_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3.2 trips
DROP TRIGGER IF EXISTS update_trips_updated_at ON trips;
DROP TRIGGER IF EXISTS trigger_trips_updated_at ON trips;
CREATE TRIGGER trigger_trips_updated_at
  BEFORE UPDATE ON trips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3.3 offers
DROP TRIGGER IF EXISTS update_offers_updated_at ON offers;
DROP TRIGGER IF EXISTS trigger_offers_updated_at ON offers;
CREATE TRIGGER trigger_offers_updated_at
  BEFORE UPDATE ON offers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3.4 profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON profiles;
CREATE TRIGGER trigger_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Part 4: 建立 offers 索引
-- ============================================

CREATE INDEX IF NOT EXISTS idx_offers_wish_id ON offers(wish_id);
CREATE INDEX IF NOT EXISTS idx_offers_buyer_status ON offers(buyer_id, status);
CREATE INDEX IF NOT EXISTS idx_offers_shopper_status ON offers(shopper_id, status);
CREATE INDEX IF NOT EXISTS idx_offers_created ON offers(created_at DESC);

-- 唯一約束：同一代購者對同一需求只能有一筆 pending 報價
DROP INDEX IF EXISTS idx_offers_unique_pending;
CREATE UNIQUE INDEX idx_offers_unique_pending
ON offers(wish_id, shopper_id)
WHERE status = 'pending';

-- ============================================
-- Part 5: RLS 政策
-- ============================================

ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own offers" ON offers;
CREATE POLICY "Users can view own offers"
  ON offers FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = shopper_id);

DROP POLICY IF EXISTS "Shopper can create offers" ON offers;
CREATE POLICY "Shopper can create offers"
  ON offers FOR INSERT
  WITH CHECK (
    auth.uid() = shopper_id
    AND auth.uid() != buyer_id
  );

DROP POLICY IF EXISTS "Users can update own offers" ON offers;
CREATE POLICY "Users can update own offers"
  ON offers FOR UPDATE
  USING (
    (auth.uid() = shopper_id AND status = 'pending')
    OR
    (auth.uid() = buyer_id AND status = 'pending')
  );

DROP POLICY IF EXISTS "No direct delete" ON offers;
CREATE POLICY "No direct delete"
  ON offers FOR DELETE
  USING (false);

-- ============================================
-- Part 6: RPC - create_offer（建立報價）
-- ============================================

CREATE OR REPLACE FUNCTION create_offer(
  p_wish_id UUID,
  p_amount NUMERIC,
  p_message TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_shopper_id UUID := auth.uid();
  v_wish RECORD;
  v_offer_id UUID;
  v_shopper_name TEXT;
BEGIN
  IF v_shopper_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT id, buyer_id, title, status INTO v_wish
  FROM wish_requests
  WHERE id = p_wish_id;

  IF v_wish.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wish not found');
  END IF;

  IF v_wish.buyer_id = v_shopper_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot offer on your own wish');
  END IF;

  IF v_wish.status NOT IN ('open', 'available') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wish is not open for offers');
  END IF;

  IF EXISTS (
    SELECT 1 FROM offers 
    WHERE wish_id = p_wish_id 
      AND shopper_id = v_shopper_id 
      AND status = 'pending'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You already have a pending offer');
  END IF;

  SELECT name INTO v_shopper_name FROM profiles WHERE id = v_shopper_id;

  INSERT INTO offers (wish_id, buyer_id, shopper_id, amount, message, status)
  VALUES (p_wish_id, v_wish.buyer_id, v_shopper_id, p_amount, p_message, 'pending')
  RETURNING id INTO v_offer_id;

  -- 建立通知給買家
  INSERT INTO notifications (
    user_id, actor_id, type, title, body, deep_link, data, dedupe_key
  ) VALUES (
    v_wish.buyer_id,
    v_shopper_id,
    'offer_created',
    '收到新報價',
    COALESCE(v_shopper_name, '代購者') || ' 對「' || COALESCE(v_wish.title, '你的需求') || '」報價 NT$' || p_amount::TEXT,
    '/wish/' || p_wish_id::TEXT,
    jsonb_build_object('offer_id', v_offer_id, 'wish_id', p_wish_id, 'amount', p_amount, 'shopper_id', v_shopper_id),
    'offer:' || v_offer_id::TEXT
  );

  RETURN jsonb_build_object('success', true, 'offer_id', v_offer_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_offer(UUID, NUMERIC, TEXT) TO authenticated;

-- ============================================
-- Part 7: RPC - respond_to_offer（回應報價）🔥 核心修復
-- ============================================

CREATE OR REPLACE FUNCTION respond_to_offer(
  p_offer_id UUID,
  p_action TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_buyer_id UUID := auth.uid();
  v_offer RECORD;
  v_wish RECORD;
  v_buyer_name TEXT;
  v_conversation_id UUID;
  v_user_low UUID;
  v_user_high UUID;
BEGIN
  -- 驗證身份
  IF v_buyer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF p_action NOT IN ('accept', 'reject') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid action');
  END IF;

  -- 獲取報價資料
  SELECT * INTO v_offer FROM offers WHERE id = p_offer_id;

  IF v_offer.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Offer not found');
  END IF;

  IF v_offer.buyer_id != v_buyer_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  IF v_offer.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Offer is no longer pending');
  END IF;

  -- 獲取 wish 資料
  SELECT * INTO v_wish FROM wish_requests WHERE id = v_offer.wish_id;
  
  -- 獲取買家名稱
  SELECT name INTO v_buyer_name FROM profiles WHERE id = v_buyer_id;

  -- 更新報價狀態（trigger 會自動更新 updated_at）
  UPDATE offers
  SET status = CASE WHEN p_action = 'accept' THEN 'accepted' ELSE 'rejected' END
  WHERE id = p_offer_id;

  -- 如果接受
  IF p_action = 'accept' THEN
    -- 將其他 pending 報價設為 rejected
    UPDATE offers
    SET status = 'rejected'
    WHERE wish_id = v_offer.wish_id
      AND id != p_offer_id
      AND status = 'pending';
    
    -- 更新 wish 狀態（trigger 會自動更新 updated_at）
    UPDATE wish_requests
    SET status = 'in_progress'
    WHERE id = v_offer.wish_id;
  END IF;

  -- 建立通知給代購者
  INSERT INTO notifications (
    user_id, actor_id, type, title, body, deep_link, data, dedupe_key
  ) VALUES (
    v_offer.shopper_id,
    v_buyer_id,
    CASE WHEN p_action = 'accept' THEN 'offer_accepted' ELSE 'offer_rejected' END,
    CASE WHEN p_action = 'accept' THEN '報價已被接受！🎉' ELSE '報價未被接受' END,
    COALESCE(v_buyer_name, '買家') || CASE 
      WHEN p_action = 'accept' THEN ' 接受了你對「' || COALESCE(v_wish.title, '需求') || '」的報價'
      ELSE ' 未接受你對「' || COALESCE(v_wish.title, '需求') || '」的報價'
    END,
    CASE WHEN p_action = 'accept' THEN '/chat' ELSE '/wish/' || v_offer.wish_id::TEXT END,
    jsonb_build_object('offer_id', p_offer_id, 'wish_id', v_offer.wish_id, 'action', p_action),
    'offer_response:' || p_offer_id::TEXT
  );

  -- 如果接受，建立聊天室
  IF p_action = 'accept' THEN
    -- 計算 user_low 和 user_high（確保一致性）
    IF v_buyer_id < v_offer.shopper_id THEN
      v_user_low := v_buyer_id;
      v_user_high := v_offer.shopper_id;
    ELSE
      v_user_low := v_offer.shopper_id;
      v_user_high := v_buyer_id;
    END IF;

    -- 嘗試找到現有聊天室
    SELECT id INTO v_conversation_id
    FROM conversations
    WHERE user_low_id = v_user_low
      AND user_high_id = v_user_high
      AND source_type = 'wish_request'
      AND source_id = v_offer.wish_id
    LIMIT 1;

    -- 如果不存在則建立
    IF v_conversation_id IS NULL THEN
      INSERT INTO conversations (
        user1_id, user2_id, user_low_id, user_high_id,
        source_type, source_id, source_title, last_message_at
      ) VALUES (
        v_buyer_id, v_offer.shopper_id, v_user_low, v_user_high,
        'wish_request', v_offer.wish_id, v_wish.title, NOW()
      )
      ON CONFLICT DO NOTHING
      RETURNING id INTO v_conversation_id;

      -- 如果 INSERT 沒有返回（因為衝突），再查一次
      IF v_conversation_id IS NULL THEN
        SELECT id INTO v_conversation_id
        FROM conversations
        WHERE user_low_id = v_user_low
          AND user_high_id = v_user_high
          AND source_type = 'wish_request'
          AND source_id = v_offer.wish_id
        LIMIT 1;
      END IF;
    END IF;

    RETURN jsonb_build_object(
      'success', true,
      'action', p_action,
      'conversation_id', v_conversation_id
    );
  END IF;

  RETURN jsonb_build_object('success', true, 'action', p_action);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION respond_to_offer(UUID, TEXT) TO authenticated;

-- ============================================
-- Part 8: RPC - withdraw_offer（撤回報價）
-- ============================================

CREATE OR REPLACE FUNCTION withdraw_offer(p_offer_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_shopper_id UUID := auth.uid();
  v_offer RECORD;
BEGIN
  IF v_shopper_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO v_offer FROM offers WHERE id = p_offer_id;

  IF v_offer.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Offer not found');
  END IF;

  IF v_offer.shopper_id != v_shopper_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  IF v_offer.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Offer is no longer pending');
  END IF;

  UPDATE offers SET status = 'withdrawn' WHERE id = p_offer_id;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION withdraw_offer(UUID) TO authenticated;

-- ============================================
-- Part 9: RPC - get_offers_for_wish
-- ============================================

CREATE OR REPLACE FUNCTION get_offers_for_wish(p_wish_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_wish RECORD;
  v_offers JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT buyer_id INTO v_wish FROM wish_requests WHERE id = p_wish_id;

  IF v_wish.buyer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wish not found');
  END IF;

  SELECT jsonb_agg(row_to_json(o.*) ORDER BY o.created_at DESC)
  INTO v_offers
  FROM (
    SELECT 
      of.id,
      of.wish_id,
      of.shopper_id,
      of.amount,
      of.currency,
      of.message,
      of.status,
      of.created_at,
      of.updated_at,
      p.name AS shopper_name,
      p.avatar_url AS shopper_avatar
    FROM offers of
    JOIN profiles p ON p.id = of.shopper_id
    WHERE of.wish_id = p_wish_id
      AND (
        v_user_id = v_wish.buyer_id
        OR of.shopper_id = v_user_id
      )
  ) o;

  RETURN jsonb_build_object(
    'success', true,
    'offers', COALESCE(v_offers, '[]'::jsonb),
    'is_buyer', v_user_id = v_wish.buyer_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_offers_for_wish(UUID) TO authenticated;

-- ============================================
-- Part 10: RPC - get_my_offers
-- ============================================

CREATE OR REPLACE FUNCTION get_my_offers(p_status TEXT DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_offers JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT jsonb_agg(row_to_json(o.*) ORDER BY o.created_at DESC)
  INTO v_offers
  FROM (
    SELECT 
      of.id,
      of.wish_id,
      of.amount,
      of.currency,
      of.message,
      of.status,
      of.created_at,
      of.updated_at,
      w.title AS wish_title,
      w.budget AS wish_budget,
      w.target_country,
      p.name AS buyer_name
    FROM offers of
    JOIN wish_requests w ON w.id = of.wish_id
    JOIN profiles p ON p.id = of.buyer_id
    WHERE of.shopper_id = v_user_id
      AND (p_status IS NULL OR of.status = p_status)
  ) o;

  RETURN jsonb_build_object(
    'success', true,
    'offers', COALESCE(v_offers, '[]'::jsonb)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_my_offers(TEXT) TO authenticated;

-- ============================================
-- Part 11: 確保 conversations 表有必要欄位
-- ============================================

-- 確保 conversations 有 user_low_id 和 user_high_id
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS user_low_id UUID;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS user_high_id UUID;

-- 回填 user_low_id 和 user_high_id
UPDATE conversations
SET 
  user_low_id = LEAST(user1_id, user2_id),
  user_high_id = GREATEST(user1_id, user2_id)
WHERE user_low_id IS NULL OR user_high_id IS NULL;

-- 建立唯一索引（如果不存在）
DROP INDEX IF EXISTS idx_conversations_stable_unique;
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_stable_unique
ON conversations (
  user_low_id,
  user_high_id,
  COALESCE(source_type, 'direct'),
  COALESCE(source_id, '00000000-0000-0000-0000-000000000000'::uuid)
);

-- ============================================
-- Part 12: 驗證修復
-- ============================================

DO $$
DECLARE
  v_has_updated_at BOOLEAN;
BEGIN
  -- 檢查 wish_requests 是否有 updated_at
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wish_requests' AND column_name = 'updated_at'
  ) INTO v_has_updated_at;
  
  IF v_has_updated_at THEN
    RAISE NOTICE '✅ wish_requests.updated_at 欄位已存在';
  ELSE
    RAISE EXCEPTION '❌ wish_requests.updated_at 欄位不存在，請檢查 migration';
  END IF;
  
  -- 檢查 offers 是否有 updated_at
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'offers' AND column_name = 'updated_at'
  ) INTO v_has_updated_at;
  
  IF v_has_updated_at THEN
    RAISE NOTICE '✅ offers.updated_at 欄位已存在';
  ELSE
    RAISE EXCEPTION '❌ offers.updated_at 欄位不存在，請檢查 migration';
  END IF;
END $$;

SELECT '✅ Offer 系統完整修復已完成！' AS status;
SELECT '✅ wish_requests, trips, offers, profiles 表都已添加 updated_at trigger' AS status;
SELECT '✅ respond_to_offer RPC 已修復' AS status;


















