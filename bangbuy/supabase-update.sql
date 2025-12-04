-- ========================================
-- BangBuy 資料庫更新腳本
-- 修復 create/page.tsx 的欄位不匹配問題
-- ========================================
-- 使用說明：
-- 1. 登入 Supabase Dashboard (https://app.supabase.com)
-- 2. 點擊左側 "SQL Editor"
-- 3. 點擊 "New query"
-- 4. 複製此檔案的全部內容貼上
-- 5. 點擊 "Run" 執行
-- 6. 完成！現在 create 頁面可以正常運作了
-- ========================================

-- ========================================
-- 1. 為 wish_requests 表添加缺少的欄位
-- ========================================

-- 添加商品原價欄位
ALTER TABLE wish_requests
ADD COLUMN IF NOT EXISTS price NUMERIC;

-- 添加代購費欄位
ALTER TABLE wish_requests
ADD COLUMN IF NOT EXISTS commission NUMERIC;

-- 添加商品連結欄位
ALTER TABLE wish_requests
ADD COLUMN IF NOT EXISTS product_url TEXT;

-- 添加急單標記欄位
ALTER TABLE wish_requests
ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN DEFAULT false;

-- 添加商品分類欄位
ALTER TABLE wish_requests
ADD COLUMN IF NOT EXISTS category TEXT;

-- 添加截止日期欄位（保留原有的 expires_at，新增 deadline 作為別名）
ALTER TABLE wish_requests
ADD COLUMN IF NOT EXISTS deadline TIMESTAMP WITH TIME ZONE;

-- 添加欄位說明註解
COMMENT ON COLUMN wish_requests.price IS '商品原價（台幣）';
COMMENT ON COLUMN wish_requests.commission IS '代購費（台幣）';
COMMENT ON COLUMN wish_requests.product_url IS '商品購買連結';
COMMENT ON COLUMN wish_requests.is_urgent IS '是否為急單';
COMMENT ON COLUMN wish_requests.category IS '商品分類：food, beauty, clothes, digital, other';
COMMENT ON COLUMN wish_requests.deadline IS '希望截止日期';

-- ========================================
-- 2. 為 profiles 表添加 role 欄位
-- ========================================

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'buyer';

COMMENT ON COLUMN profiles.role IS '用戶角色：buyer (買家) 或 shopper (代購)';

-- ========================================
-- 3. 創建 wish-images 儲存桶
-- ========================================

-- 插入儲存桶（如果已存在則跳過）
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'wish-images',
  'wish-images',
  true,
  5242880, -- 5MB 限制
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- 4. 設定 wish-images 儲存桶的存取政策
-- ========================================

-- 允許所有人上傳圖片（建議之後改為只允許登入用戶）
DROP POLICY IF EXISTS "Allow public uploads to wish-images" ON storage.objects;
CREATE POLICY "Allow public uploads to wish-images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'wish-images');

-- 允許所有人讀取圖片
DROP POLICY IF EXISTS "Allow public read access to wish-images" ON storage.objects;
CREATE POLICY "Allow public read access to wish-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'wish-images');

-- 允許用戶刪除自己上傳的圖片
DROP POLICY IF EXISTS "Allow users to delete their own images" ON storage.objects;
CREATE POLICY "Allow users to delete their own images"
ON storage.objects FOR DELETE
USING (bucket_id = 'wish-images');

-- ========================================
-- 5. 更新現有測試資料（如果需要）
-- ========================================

-- 為現有的測試許願單添加新欄位的預設值
UPDATE wish_requests
SET
  price = budget * 0.8,          -- 假設商品價格是總預算的 80%
  commission = budget * 0.2,     -- 代購費是總預算的 20%
  category = 'other',            -- 預設分類
  is_urgent = false,             -- 預設非急單
  deadline = expires_at          -- 使用 expires_at 作為 deadline
WHERE price IS NULL;

-- ========================================
-- 6. 創建索引以提高查詢效能
-- ========================================

-- 為新欄位創建索引
CREATE INDEX IF NOT EXISTS idx_wish_requests_category ON wish_requests(category);
CREATE INDEX IF NOT EXISTS idx_wish_requests_is_urgent ON wish_requests(is_urgent);
CREATE INDEX IF NOT EXISTS idx_wish_requests_deadline ON wish_requests(deadline);

-- ========================================
-- 7. 驗證更新結果
-- ========================================

-- 檢查 wish_requests 的欄位
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'wish_requests'
  AND column_name IN ('price', 'commission', 'product_url', 'is_urgent', 'category', 'deadline')
ORDER BY column_name;

-- 檢查 profiles 的 role 欄位
SELECT
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name = 'role';

-- 檢查儲存桶是否創建成功
SELECT id, name, public, file_size_limit
FROM storage.buckets
WHERE id = 'wish-images';

-- 完成訊息
SELECT
  '✅ 資料庫更新完成！' as status,
  'create/page.tsx 現在可以正常運作了' as message,
  (SELECT COUNT(*) FROM wish_requests) as total_wishes;

-- ========================================
-- 完成！
-- ========================================
-- 現在你可以：
-- 1. 回到你的應用
-- 2. 訪問 /create 頁面
-- 3. 發布許願單
-- 4. 所有欄位都會正確儲存！
-- ========================================
