-- ============================================
-- notification_jobs 表（用於推播去重與節流）
-- ============================================

-- 建立 notification_jobs 表
CREATE TABLE IF NOT EXISTS notification_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  entity_id text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}',
  dedupe_key text NOT NULL UNIQUE,
  throttle_key text NOT NULL,
  throttle_window_sec int NOT NULL DEFAULT 30,
  pending_count int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  last_aggregated_at timestamptz
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_notification_jobs_throttle_key_sent_at 
  ON notification_jobs(throttle_key, sent_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_notification_jobs_user_id_created_at 
  ON notification_jobs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_jobs_dedupe_key 
  ON notification_jobs(dedupe_key);

CREATE INDEX IF NOT EXISTS idx_notification_jobs_sent_at 
  ON notification_jobs(sent_at) WHERE sent_at IS NOT NULL;

-- 啟用 RLS
ALTER TABLE notification_jobs ENABLE ROW LEVEL SECURITY;

-- 允許 service role 完全存取（用於 API server）
CREATE POLICY "Service role full access on notification_jobs"
  ON notification_jobs
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 允許已登入用戶讀取自己的 notification jobs（用於 debug）
CREATE POLICY "Users can read own notification_jobs"
  ON notification_jobs
  FOR SELECT
  USING (auth.uid() = user_id);

-- 註：INSERT/UPDATE/DELETE 僅允許 service role（透過上面的 policy）




