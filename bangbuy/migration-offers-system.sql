-- ============================================
-- 🏷️ BangBuy Offer 報價系統
-- 完整 Migration Script
-- 請在 Supabase SQL Editor 中執行
-- ============================================

SET search_path = public;

-- ============================================
-- 1. 建立 offers 表
-- ============================================

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

-- 索引
CREATE INDEX IF NOT EXISTS idx_offers_wish_id ON offers(wish_id);
CREATE INDEX IF NOT EXISTS idx_offers_buyer_status ON offers(buyer_id, status);
CREATE INDEX IF NOT EXISTS idx_offers_shopper_status ON offers(shopper_id, status);
CREATE INDEX IF NOT EXISTS idx_offers_created ON offers(created_at DESC);

-- 唯一約束：同一代購者對同一需求只能有一筆 pending 報價
CREATE UNIQUE INDEX IF NOT EXISTS idx_offers_unique_pending
ON offers(wish_id, shopper_id)
WHERE status = 'pending';

-- ============================================
-- 2. updated_at 自動更新 Trigger
-- ============================================

CREATE OR REPLACE FUNCTION update_offers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_offers_updated_at ON offers;
CREATE TRIGGER trigger_offers_updated_at
  BEFORE UPDATE ON offers
  FOR EACH ROW EXECUTE FUNCTION update_offers_updated_at();

-- ============================================
-- 3. RLS 政策
-- ============================================

ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

-- SELECT：只有 buyer 或 shopper 能看到
DROP POLICY IF EXISTS "Users can view own offers" ON offers;
CREATE POLICY "Users can view own offers"
  ON offers FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = shopper_id);

-- INSERT：只有 shopper 能建立報價
DROP POLICY IF EXISTS "Shopper can create offers" ON offers;
CREATE POLICY "Shopper can create offers"
  ON offers FOR INSERT
  WITH CHECK (
    auth.uid() = shopper_id
    AND auth.uid() != buyer_id  -- 不能對自己的需求報價
  );

-- UPDATE：限制更新權限
DROP POLICY IF EXISTS "Users can update own offers" ON offers;
CREATE POLICY "Users can update own offers"
  ON offers FOR UPDATE
  USING (
    -- shopper 可以撤回自己的報價
    (auth.uid() = shopper_id AND status = 'pending')
    OR
    -- buyer 可以接受或拒絕收到的報價
    (auth.uid() = buyer_id AND status = 'pending')
  );

-- DELETE：禁止直接刪除
DROP POLICY IF EXISTS "No direct delete" ON offers;
CREATE POLICY "No direct delete"
  ON offers FOR DELETE
  USING (false);

-- ============================================
-- 4. RPC：建立報價（含通知）
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
  -- 驗證
  IF v_shopper_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- 獲取 wish 資料
  SELECT id, buyer_id, title, status INTO v_wish
  FROM wish_requests
  WHERE id = p_wish_id;

  IF v_wish.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wish not found');
  END IF;

  IF v_wish.buyer_id = v_shopper_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot offer on your own wish');
  END IF;

  IF v_wish.status != 'open' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wish is not open for offers');
  END IF;

  -- 檢查是否已有 pending 報價
  IF EXISTS (
    SELECT 1 FROM offers 
    WHERE wish_id = p_wish_id 
      AND shopper_id = v_shopper_id 
      AND status = 'pending'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You already have a pending offer');
  END IF;

  -- 獲取代購者名稱
  SELECT name INTO v_shopper_name FROM profiles WHERE id = v_shopper_id;

  -- 插入報價
  INSERT INTO offers (wish_id, buyer_id, shopper_id, amount, message, status)
  VALUES (p_wish_id, v_wish.buyer_id, v_shopper_id, p_amount, p_message, 'pending')
  RETURNING id INTO v_offer_id;

  -- 建立通知給買家（使用 SECURITY DEFINER 繞過 RLS）
  INSERT INTO notifications (
    user_id,
    actor_id,
    type,
    title,
    body,
    deep_link,
    data,
    dedupe_key
  ) VALUES (
    v_wish.buyer_id,
    v_shopper_id,
    'offer_created',
    '收到新報價',
    COALESCE(v_shopper_name, '代購者') || ' 對「' || COALESCE(v_wish.title, '你的需求') || '」報價 NT$' || p_amount::TEXT,
    '/wish/' || p_wish_id::TEXT,
    jsonb_build_object(
      'offer_id', v_offer_id,
      'wish_id', p_wish_id,
      'amount', p_amount,
      'shopper_id', v_shopper_id
    ),
    'offer:' || v_offer_id::TEXT
  );

  RETURN jsonb_build_object(
    'success', true,
    'offer_id', v_offer_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_offer(UUID, NUMERIC, TEXT) TO authenticated;

-- ============================================
-- 5. RPC：回應報價（接受/拒絕）
-- ============================================

CREATE OR REPLACE FUNCTION respond_to_offer(
  p_offer_id UUID,
  p_action TEXT  -- 'accept' or 'reject'
)
RETURNS JSONB AS $$
DECLARE
  v_buyer_id UUID := auth.uid();
  v_offer RECORD;
  v_wish RECORD;
  v_buyer_name TEXT;
  v_conversation_id UUID;
BEGIN
  -- 驗證
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

  -- 更新報價狀態
  UPDATE offers
  SET status = CASE WHEN p_action = 'accept' THEN 'accepted' ELSE 'rejected' END
  WHERE id = p_offer_id;

  -- 如果接受，將其他 pending 報價設為 rejected
  IF p_action = 'accept' THEN
    UPDATE offers
    SET status = 'rejected'
    WHERE wish_id = v_offer.wish_id
      AND id != p_offer_id
      AND status = 'pending';
    
    -- 更新 wish 狀態為 in_progress
    UPDATE wish_requests
    SET status = 'in_progress'
    WHERE id = v_offer.wish_id;
  END IF;

  -- 建立通知給代購者
  INSERT INTO notifications (
    user_id,
    actor_id,
    type,
    title,
    body,
    deep_link,
    data,
    dedupe_key
  ) VALUES (
    v_offer.shopper_id,
    v_buyer_id,
    CASE WHEN p_action = 'accept' THEN 'offer_accepted' ELSE 'offer_rejected' END,
    CASE WHEN p_action = 'accept' THEN '報價已被接受！🎉' ELSE '報價未被接受' END,
    COALESCE(v_buyer_name, '買家') || CASE 
      WHEN p_action = 'accept' THEN ' 接受了你對「' || COALESCE(v_wish.title, '需求') || '」的報價'
      ELSE ' 未接受你對「' || COALESCE(v_wish.title, '需求') || '」的報價'
    END,
    '/wish/' || v_offer.wish_id::TEXT,
    jsonb_build_object(
      'offer_id', p_offer_id,
      'wish_id', v_offer.wish_id,
      'action', p_action
    ),
    'offer_response:' || p_offer_id::TEXT
  );

  -- 如果接受，建立聊天室並回傳 conversation_id
  IF p_action = 'accept' THEN
    -- 使用現有的 get_or_create_conversation
    SELECT conversation_id INTO v_conversation_id
    FROM get_or_create_conversation(
      v_offer.shopper_id,
      'wish_request',
      v_offer.wish_id,
      v_wish.title
    );

    RETURN jsonb_build_object(
      'success', true,
      'action', p_action,
      'conversation_id', v_conversation_id
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'action', p_action
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION respond_to_offer(UUID, TEXT) TO authenticated;

-- ============================================
-- 6. RPC：撤回報價
-- ============================================

CREATE OR REPLACE FUNCTION withdraw_offer(p_offer_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_shopper_id UUID := auth.uid();
  v_offer RECORD;
BEGIN
  -- 驗證
  IF v_shopper_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- 獲取報價資料
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

  -- 更新狀態
  UPDATE offers SET status = 'withdrawn' WHERE id = p_offer_id;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION withdraw_offer(UUID) TO authenticated;

-- ============================================
-- 7. RPC：獲取需求的報價列表
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

  -- 獲取 wish 資料
  SELECT buyer_id INTO v_wish FROM wish_requests WHERE id = p_wish_id;

  IF v_wish.buyer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wish not found');
  END IF;

  -- 買家可以看到所有報價，代購者只能看到自己的
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
        v_user_id = v_wish.buyer_id  -- 買家看全部
        OR of.shopper_id = v_user_id  -- 代購者只看自己的
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
-- 8. RPC：獲取我的報價（代購者用）
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
-- 完成確認
-- ============================================

SELECT '✅ Offers 表已建立' AS status;
SELECT '✅ RLS 政策已設定' AS status;
SELECT '✅ RPC 函數已建立 (create_offer, respond_to_offer, withdraw_offer, get_offers_for_wish, get_my_offers)' AS status;












