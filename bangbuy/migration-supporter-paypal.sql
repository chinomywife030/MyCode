-- ============================================
-- Supporter PayPal 訂閱系統 Migration
-- 在 Supabase SQL Editor 執行
-- ============================================

-- 1. 確保 profiles 表有 Supporter 相關欄位
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS is_supporter BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS paypal_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS paypal_plan_id TEXT,
  ADD COLUMN IF NOT EXISTS paypal_status TEXT,
  ADD COLUMN IF NOT EXISTS supporter_since TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS supporter_updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS supporter_badge_hidden BOOLEAN DEFAULT FALSE;

-- 2. 唯一索引：避免一個訂閱綁多人（允許 null）
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_paypal_subscription_id_unique 
  ON profiles(paypal_subscription_id) 
  WHERE paypal_subscription_id IS NOT NULL;

-- 3. 建立 feature_flags 表
CREATE TABLE IF NOT EXISTS feature_flags (
  key TEXT PRIMARY KEY,
  description TEXT,
  enabled_for TEXT NOT NULL CHECK (enabled_for IN ('public', 'member', 'supporter')),
  rollout_percentage INTEGER CHECK (rollout_percentage IS NULL OR (rollout_percentage >= 0 AND rollout_percentage <= 100)),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 插入示例 flag
INSERT INTO feature_flags (key, description, enabled_for, rollout_percentage)
VALUES 
  ('early_access_demo', 'Supporter Early Access 示範功能', 'supporter', NULL)
ON CONFLICT (key) DO NOTHING;

-- 5. 建立索引
CREATE INDEX IF NOT EXISTS idx_profiles_is_supporter ON profiles(is_supporter);
CREATE INDEX IF NOT EXISTS idx_profiles_paypal_status ON profiles(paypal_status);

-- 6. RLS for feature_flags（所有人可讀）
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read feature_flags" ON feature_flags;
CREATE POLICY "Anyone can read feature_flags" ON feature_flags
  FOR SELECT USING (true);

-- 驗證
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND column_name IN ('display_name', 'is_supporter', 'paypal_subscription_id', 'paypal_plan_id', 'paypal_status', 'supporter_since', 'supporter_updated_at');

SELECT * FROM feature_flags;

SELECT 'Supporter PayPal Migration completed!' AS status;


















