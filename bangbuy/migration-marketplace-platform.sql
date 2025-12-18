-- ============================================
-- 🏪 BangBuy Marketplace 平台設計 - 資料庫遷移
-- 版本：1.0.0
-- 目的：實作早期體驗使用狀況追蹤與排序結構
-- ============================================

-- ============================================
-- 1️⃣ 每日聯繫追蹤表
-- 用於追蹤使用狀況（內部使用，不對使用者曝光）
-- ============================================

CREATE TABLE IF NOT EXISTS daily_message_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  initiated_chats_count INTEGER DEFAULT 0,
  -- 記錄「主動發起私訊」的對象 ID（防止重複計算同一對話）
  contacted_user_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- 索引：加速查詢
CREATE INDEX IF NOT EXISTS idx_daily_message_quotas_user_date 
  ON daily_message_quotas(user_id, date);

-- RLS 政策
ALTER TABLE daily_message_quotas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own quota" ON daily_message_quotas;
CREATE POLICY "Users can view own quota" 
  ON daily_message_quotas FOR SELECT 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own quota" ON daily_message_quotas;
CREATE POLICY "Users can update own quota" 
  ON daily_message_quotas FOR UPDATE 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own quota" ON daily_message_quotas;
CREATE POLICY "Users can insert own quota" 
  ON daily_message_quotas FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 2️⃣ 為 wish_requests 添加排序/優先級欄位
-- 保留「未來可限制的結構」
-- ============================================

-- priority: 0 = 一般, 1-10 = 提升曝光（保留給未來調整）
ALTER TABLE wish_requests 
  ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0;

-- score: 用於複合排序（可結合熱度、新鮮度等）
ALTER TABLE wish_requests 
  ADD COLUMN IF NOT EXISTS score NUMERIC(10,2) DEFAULT 0;

-- 索引：排序用
CREATE INDEX IF NOT EXISTS idx_wish_requests_priority 
  ON wish_requests(priority DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wish_requests_score 
  ON wish_requests(score DESC, created_at DESC);

-- ============================================
-- 3️⃣ 為 trips 添加排序/優先級欄位
-- ============================================

ALTER TABLE trips 
  ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0;

ALTER TABLE trips 
  ADD COLUMN IF NOT EXISTS score NUMERIC(10,2) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_trips_priority 
  ON trips(priority DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_trips_score 
  ON trips(score DESC, created_at DESC);

-- ============================================
-- 4️⃣ RPC：檢查聯繫狀態（內部使用）
-- 回傳：{ can_send: boolean, remaining: number, contacted_today: number }
-- ============================================

CREATE OR REPLACE FUNCTION check_daily_chat_quota(
  p_target_user_id UUID,
  p_daily_limit INTEGER DEFAULT 5
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_today DATE;
  v_quota RECORD;
  v_already_contacted BOOLEAN;
  v_remaining INTEGER;
BEGIN
  -- 獲取當前用戶
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('can_send', false, 'remaining', 0, 'contacted_today', 0, 'error', 'not_authenticated');
  END IF;
  
  -- 不能跟自己聊天
  IF v_user_id = p_target_user_id THEN
    RETURN jsonb_build_object('can_send', false, 'remaining', 0, 'contacted_today', 0, 'error', 'cannot_message_self');
  END IF;
  
  v_today := CURRENT_DATE;
  
  -- 獲取或建立今日配額記錄
  INSERT INTO daily_message_quotas (user_id, date, initiated_chats_count, contacted_user_ids)
  VALUES (v_user_id, v_today, 0, '{}')
  ON CONFLICT (user_id, date) DO NOTHING;
  
  SELECT * INTO v_quota 
  FROM daily_message_quotas 
  WHERE user_id = v_user_id AND date = v_today;
  
  -- 檢查是否已聯繫過此用戶（今天）
  v_already_contacted := p_target_user_id = ANY(v_quota.contacted_user_ids);
  
  -- 如果已聯繫過，不計入配額
  IF v_already_contacted THEN
    v_remaining := GREATEST(0, p_daily_limit - v_quota.initiated_chats_count);
    RETURN jsonb_build_object(
      'can_send', true,
      'remaining', v_remaining,
      'contacted_today', v_quota.initiated_chats_count,
      'already_contacted', true
    );
  END IF;
  
  -- 檢查是否超過限制
  IF v_quota.initiated_chats_count >= p_daily_limit THEN
    RETURN jsonb_build_object(
      'can_send', false,
      'remaining', 0,
      'contacted_today', v_quota.initiated_chats_count,
      'limit_reached', true
    );
  END IF;
  
  -- 可以發送
  v_remaining := p_daily_limit - v_quota.initiated_chats_count - 1;
  RETURN jsonb_build_object(
    'can_send', true,
    'remaining', v_remaining,
    'contacted_today', v_quota.initiated_chats_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5️⃣ RPC：記錄聯繫行為（內部追蹤）
-- 在成功建立對話後呼叫
-- ============================================

CREATE OR REPLACE FUNCTION record_chat_initiated(
  p_target_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_today DATE;
  v_already_contacted BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;
  
  v_today := CURRENT_DATE;
  
  -- 檢查是否已聯繫過
  SELECT p_target_user_id = ANY(contacted_user_ids) INTO v_already_contacted
  FROM daily_message_quotas 
  WHERE user_id = v_user_id AND date = v_today;
  
  -- 已聯繫過，不更新
  IF v_already_contacted THEN
    RETURN jsonb_build_object('success', true, 'already_contacted', true);
  END IF;
  
  -- 更新配額
  UPDATE daily_message_quotas 
  SET 
    initiated_chats_count = initiated_chats_count + 1,
    contacted_user_ids = array_append(contacted_user_ids, p_target_user_id),
    updated_at = NOW()
  WHERE user_id = v_user_id AND date = v_today;
  
  -- 如果沒有記錄（可能第一次），建立一個
  IF NOT FOUND THEN
    INSERT INTO daily_message_quotas (user_id, date, initiated_chats_count, contacted_user_ids)
    VALUES (v_user_id, v_today, 1, ARRAY[p_target_user_id])
    ON CONFLICT (user_id, date) DO UPDATE SET
      initiated_chats_count = daily_message_quotas.initiated_chats_count + 1,
      contacted_user_ids = array_append(daily_message_quotas.contacted_user_ids, p_target_user_id),
      updated_at = NOW();
  END IF;
  
  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6️⃣ RPC：獲取使用狀況（內部追蹤）
-- ============================================

CREATE OR REPLACE FUNCTION get_daily_chat_quota(
  p_daily_limit INTEGER DEFAULT 5
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_today DATE;
  v_quota RECORD;
  v_remaining INTEGER;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('remaining', 0, 'contacted_today', 0, 'limit', p_daily_limit);
  END IF;
  
  v_today := CURRENT_DATE;
  
  SELECT * INTO v_quota 
  FROM daily_message_quotas 
  WHERE user_id = v_user_id AND date = v_today;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'remaining', p_daily_limit,
      'contacted_today', 0,
      'limit', p_daily_limit
    );
  END IF;
  
  v_remaining := GREATEST(0, p_daily_limit - v_quota.initiated_chats_count);
  
  RETURN jsonb_build_object(
    'remaining', v_remaining,
    'contacted_today', v_quota.initiated_chats_count,
    'limit', p_daily_limit
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ✅ 完成
-- ============================================

SELECT '✅ Marketplace platform migration completed' AS status;
SELECT '✅ Early access usage tracking system ready' AS status;
SELECT '✅ Priority/score fields added to wish_requests and trips' AS status;

