-- ============================================
-- 🏁 BangBuy 完成交易功能
-- Migration Script
-- 請在 Supabase SQL Editor 中執行
-- ============================================

SET search_path = public;

-- ============================================
-- 1. 確保 wish_requests.status 支援必要狀態
-- ============================================

-- 先移除舊的 check 約束（如果存在）
ALTER TABLE wish_requests DROP CONSTRAINT IF EXISTS wish_requests_status_check;

-- 添加新的 check 約束，包含 in_progress 和 completed
ALTER TABLE wish_requests ADD CONSTRAINT wish_requests_status_check 
  CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled', 'closed'));

-- 添加 completed_at 欄位（如果不存在）
ALTER TABLE wish_requests ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- 添加 accepted_shopper_id 欄位（記錄接單者，如果不存在）
ALTER TABLE wish_requests ADD COLUMN IF NOT EXISTS accepted_shopper_id UUID REFERENCES profiles(id);

-- ============================================
-- 2. 建立索引
-- ============================================

CREATE INDEX IF NOT EXISTS idx_wish_requests_completed ON wish_requests(status) WHERE status = 'completed';

-- ============================================
-- 3. RPC：完成交易
-- ============================================

CREATE OR REPLACE FUNCTION complete_wish_transaction(
  p_wish_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_buyer_id UUID := auth.uid();
  v_wish RECORD;
  v_accepted_offer RECORD;
  v_shopper_id UUID;
  v_buyer_name TEXT;
BEGIN
  -- 驗證身份
  IF v_buyer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- 獲取 wish 資料
  SELECT * INTO v_wish FROM wish_requests WHERE id = p_wish_id;

  IF v_wish.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wish not found');
  END IF;

  -- 只有發布者可以完成交易
  IF v_wish.buyer_id != v_buyer_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized - only wish owner can complete');
  END IF;

  -- 只有 in_progress 狀態可以完成
  IF v_wish.status != 'in_progress' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only in-progress wishes can be completed');
  END IF;

  -- 找出接受的報價以取得代購者 ID
  SELECT shopper_id INTO v_shopper_id
  FROM offers
  WHERE wish_id = p_wish_id AND status = 'accepted'
  LIMIT 1;

  -- 如果沒有 accepted offer，也嘗試從 accepted_shopper_id 取得
  IF v_shopper_id IS NULL THEN
    v_shopper_id := v_wish.accepted_shopper_id;
  END IF;

  -- 獲取買家名稱
  SELECT name INTO v_buyer_name FROM profiles WHERE id = v_buyer_id;

  -- 更新 wish 狀態為 completed
  UPDATE wish_requests
  SET 
    status = 'completed',
    completed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_wish_id;

  -- 更新相關的 offer 狀態（如果有）
  UPDATE offers
  SET status = 'expired', updated_at = NOW()
  WHERE wish_id = p_wish_id AND status = 'pending';

  -- 發送通知給代購者（如果有）
  IF v_shopper_id IS NOT NULL THEN
    INSERT INTO notifications (
      user_id,
      type,
      title,
      content,
      link,
      is_read,
      created_at
    ) VALUES (
      v_shopper_id,
      'transaction_completed',
      '🎉 交易已完成',
      COALESCE(v_buyer_name, '買家') || ' 已確認完成交易：' || v_wish.title,
      '/dashboard/orders',
      false,
      NOW()
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'wish_id', p_wish_id,
    'shopper_id', v_shopper_id
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION complete_wish_transaction(UUID) TO authenticated;

-- ============================================
-- 4. 完成
-- ============================================

-- 確保 updated_at trigger 存在
CREATE OR REPLACE FUNCTION update_wish_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_wish_requests_updated_at ON wish_requests;
CREATE TRIGGER trigger_wish_requests_updated_at
  BEFORE UPDATE ON wish_requests
  FOR EACH ROW EXECUTE FUNCTION update_wish_requests_updated_at();

COMMENT ON FUNCTION complete_wish_transaction IS '完成交易 - 只有 wish 發布者可以在 in_progress 狀態時呼叫';

