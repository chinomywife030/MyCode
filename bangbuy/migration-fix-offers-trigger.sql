-- ============================================
-- 🔧 修復 Offers 系統觸發器問題
-- 錯誤：record "new" has no field "updated_at"
-- ============================================

SET search_path = public;

-- ============================================
-- 1. 確保 wish_requests 有 updated_at 欄位
-- ============================================

ALTER TABLE wish_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 回填現有資料
UPDATE wish_requests SET updated_at = created_at WHERE updated_at IS NULL;

-- ============================================
-- 2. 確保 offers 表的 updated_at 觸發器正確
-- ============================================

-- 先刪除可能有問題的觸發器
DROP TRIGGER IF EXISTS trigger_offers_updated_at ON offers;
DROP TRIGGER IF EXISTS update_offers_updated_at ON offers;

-- 確保函數存在且正確
CREATE OR REPLACE FUNCTION update_offers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 重新創建觸發器
CREATE TRIGGER trigger_offers_updated_at
  BEFORE UPDATE ON offers
  FOR EACH ROW EXECUTE FUNCTION update_offers_updated_at();

-- ============================================
-- 3. 修復 respond_to_offer 函數
--    移除對 wish_requests 的 status 更新（如果它觸發了問題）
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

  -- 更新報價狀態（這裡會觸發 offers 的 updated_at trigger）
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
    
    -- 更新 wish 狀態為 in_progress（確保有 updated_at 欄位）
    UPDATE wish_requests
    SET status = 'in_progress',
        updated_at = NOW()
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

-- ============================================
-- 4. 檢查並移除 wish_requests 上可能有問題的 trigger
-- ============================================

-- 列出 wish_requests 上的所有 triggers
DO $$
DECLARE
  trigger_rec RECORD;
BEGIN
  FOR trigger_rec IN 
    SELECT tgname FROM pg_trigger 
    WHERE tgrelid = 'wish_requests'::regclass
  LOOP
    RAISE NOTICE 'Found trigger on wish_requests: %', trigger_rec.tgname;
  END LOOP;
END $$;

-- 如果有 updated_at trigger 但表沒有該欄位，這會導致錯誤
-- 我們已經在上面添加了 updated_at 欄位，所以應該沒問題了

-- ============================================
-- 5. 為 wish_requests 添加 updated_at trigger（可選）
-- ============================================

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

-- ============================================
-- 完成
-- ============================================

SELECT '✅ 已修復 offers 觸發器問題' AS status;
SELECT '✅ 已為 wish_requests 添加 updated_at 欄位' AS status;











