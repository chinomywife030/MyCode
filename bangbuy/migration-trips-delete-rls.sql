-- ============================================
-- Trips 刪除功能 RLS Policy 確認與更新
-- 在 Supabase SQL Editor 執行
-- ============================================

-- 確認 trips 表已有 shopper_id 欄位（應該已經存在）
-- 如果沒有，請先執行：
-- ALTER TABLE trips ADD COLUMN IF NOT EXISTS shopper_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- 更新現有資料：確保所有行程都有 shopper_id（如果沒有）
-- 注意：這會將沒有 shopper_id 的行程設為 NULL，需要手動處理
-- UPDATE trips SET shopper_id = (SELECT id FROM profiles LIMIT 1) WHERE shopper_id IS NULL;

-- ============================================
-- RLS Policies（確保擁有者可以刪除自己的行程）
-- ============================================

-- 1. SELECT: 所有人可讀（已存在，確認即可）
DROP POLICY IF EXISTS "Trips are viewable by everyone" ON trips;
CREATE POLICY "Trips are viewable by everyone" 
  ON trips FOR SELECT 
  USING (true);

-- 2. INSERT: 只有登入用戶可以建立行程，且 shopper_id 必須是自己
DROP POLICY IF EXISTS "Users can create trips" ON trips;
CREATE POLICY "Users can create trips" 
  ON trips FOR INSERT 
  WITH CHECK (auth.uid() = shopper_id);

-- 3. UPDATE: 只有擁有者可以更新自己的行程
DROP POLICY IF EXISTS "Users can update own trips" ON trips;
CREATE POLICY "Users can update own trips" 
  ON trips FOR UPDATE 
  USING (auth.uid() = shopper_id);

-- 4. DELETE: 只有擁有者可以刪除自己的行程（關鍵 policy）
DROP POLICY IF EXISTS "Users can delete own trips" ON trips;
CREATE POLICY "Users can delete own trips" 
  ON trips FOR DELETE 
  USING (auth.uid() = shopper_id);

-- ============================================
-- 驗證
-- ============================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'trips'
ORDER BY policyname;

SELECT 'Trips delete RLS policy migration completed!' AS status;

-- Trips 刪除功能 RLS Policy 確認與更新
-- 在 Supabase SQL Editor 執行
-- ============================================

-- 確認 trips 表已有 shopper_id 欄位（應該已經存在）
-- 如果沒有，請先執行：
-- ALTER TABLE trips ADD COLUMN IF NOT EXISTS shopper_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- ============================================
-- RLS Policies（確保擁有者可以刪除自己的行程）
-- ============================================

-- 1. SELECT: 所有人可讀（已存在，確認即可）
DROP POLICY IF EXISTS "Trips are viewable by everyone" ON trips;
CREATE POLICY "Trips are viewable by everyone" 
  ON trips FOR SELECT 
  USING (true);

-- 2. INSERT: 只有登入用戶可以建立行程，且 shopper_id 必須是自己
DROP POLICY IF EXISTS "Users can create trips" ON trips;
CREATE POLICY "Users can create trips" 
  ON trips FOR INSERT 
  WITH CHECK (auth.uid() = shopper_id);

-- 3. UPDATE: 只有擁有者可以更新自己的行程
DROP POLICY IF EXISTS "Users can update own trips" ON trips;
CREATE POLICY "Users can update own trips" 
  ON trips FOR UPDATE 
  USING (auth.uid() = shopper_id);

-- 4. DELETE: 只有擁有者可以刪除自己的行程（關鍵 policy）
DROP POLICY IF EXISTS "Users can delete own trips" ON trips;
CREATE POLICY "Users can delete own trips" 
  ON trips FOR DELETE 
  USING (auth.uid() = shopper_id);

-- ============================================
-- 驗證
-- ============================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'trips'
ORDER BY policyname;

SELECT 'Trips delete RLS policy migration completed!' AS status;



-- Trips 刪除功能 RLS Policy 確認與更新
-- 在 Supabase SQL Editor 執行
-- ============================================

-- 確認 trips 表已有 shopper_id 欄位（應該已經存在）
-- 如果沒有，請先執行：
-- ALTER TABLE trips ADD COLUMN IF NOT EXISTS shopper_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- 更新現有資料：確保所有行程都有 shopper_id（如果沒有）
-- 注意：這會將沒有 shopper_id 的行程設為 NULL，需要手動處理
-- UPDATE trips SET shopper_id = (SELECT id FROM profiles LIMIT 1) WHERE shopper_id IS NULL;

-- ============================================
-- RLS Policies（確保擁有者可以刪除自己的行程）
-- ============================================

-- 1. SELECT: 所有人可讀（已存在，確認即可）
DROP POLICY IF EXISTS "Trips are viewable by everyone" ON trips;
CREATE POLICY "Trips are viewable by everyone" 
  ON trips FOR SELECT 
  USING (true);

-- 2. INSERT: 只有登入用戶可以建立行程，且 shopper_id 必須是自己
DROP POLICY IF EXISTS "Users can create trips" ON trips;
CREATE POLICY "Users can create trips" 
  ON trips FOR INSERT 
  WITH CHECK (auth.uid() = shopper_id);

-- 3. UPDATE: 只有擁有者可以更新自己的行程
DROP POLICY IF EXISTS "Users can update own trips" ON trips;
CREATE POLICY "Users can update own trips" 
  ON trips FOR UPDATE 
  USING (auth.uid() = shopper_id);

-- 4. DELETE: 只有擁有者可以刪除自己的行程（關鍵 policy）
DROP POLICY IF EXISTS "Users can delete own trips" ON trips;
CREATE POLICY "Users can delete own trips" 
  ON trips FOR DELETE 
  USING (auth.uid() = shopper_id);

-- ============================================
-- 驗證
-- ============================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'trips'
ORDER BY policyname;

SELECT 'Trips delete RLS policy migration completed!' AS status;

-- Trips 刪除功能 RLS Policy 確認與更新
-- 在 Supabase SQL Editor 執行
-- ============================================

-- 確認 trips 表已有 shopper_id 欄位（應該已經存在）
-- 如果沒有，請先執行：
-- ALTER TABLE trips ADD COLUMN IF NOT EXISTS shopper_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- ============================================
-- RLS Policies（確保擁有者可以刪除自己的行程）
-- ============================================

-- 1. SELECT: 所有人可讀（已存在，確認即可）
DROP POLICY IF EXISTS "Trips are viewable by everyone" ON trips;
CREATE POLICY "Trips are viewable by everyone" 
  ON trips FOR SELECT 
  USING (true);

-- 2. INSERT: 只有登入用戶可以建立行程，且 shopper_id 必須是自己
DROP POLICY IF EXISTS "Users can create trips" ON trips;
CREATE POLICY "Users can create trips" 
  ON trips FOR INSERT 
  WITH CHECK (auth.uid() = shopper_id);

-- 3. UPDATE: 只有擁有者可以更新自己的行程
DROP POLICY IF EXISTS "Users can update own trips" ON trips;
CREATE POLICY "Users can update own trips" 
  ON trips FOR UPDATE 
  USING (auth.uid() = shopper_id);

-- 4. DELETE: 只有擁有者可以刪除自己的行程（關鍵 policy）
DROP POLICY IF EXISTS "Users can delete own trips" ON trips;
CREATE POLICY "Users can delete own trips" 
  ON trips FOR DELETE 
  USING (auth.uid() = shopper_id);

-- ============================================
-- 驗證
-- ============================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'trips'
ORDER BY policyname;

SELECT 'Trips delete RLS policy migration completed!' AS status;









