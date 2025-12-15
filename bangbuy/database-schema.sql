-- ============================================
-- BangBuy 完整資料庫 Schema
-- 請在 Supabase SQL Editor 中執行此腳本
-- ============================================

-- 1. 建立 profiles 資料表（用戶資料）
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT DEFAULT 'buyer' CHECK (role IN ('buyer', 'shopper')),
  is_shopper BOOLEAN DEFAULT FALSE,
  verification_status TEXT DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected')),
  student_card_url TEXT,
  rating_avg NUMERIC(3,2) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  deals_count INTEGER DEFAULT 0,
  bio TEXT,
  -- 🔐 法務條款同意記錄（用於證明用戶已同意）
  terms_accepted_at TIMESTAMPTZ,
  terms_version TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 建立 wish_requests 資料表（許願單）
CREATE TABLE IF NOT EXISTS wish_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  budget NUMERIC(10,2),
  price NUMERIC(10,2),
  commission NUMERIC(10,2),
  product_url TEXT,
  is_urgent BOOLEAN DEFAULT FALSE,
  target_country TEXT DEFAULT 'JP',
  category TEXT DEFAULT 'food',
  deadline DATE,
  buyer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'completed', 'cancelled')),
  images TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 建立 trips 資料表（代購行程）
CREATE TABLE IF NOT EXISTS trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destination TEXT NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  shopper_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  shopper_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 建立 orders 資料表（訂單）
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wish_id UUID REFERENCES wish_requests(id) ON DELETE CASCADE,
  buyer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  shopper_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'purchased', 'shipped', 'completed', 'cancelled')),
  price NUMERIC(10,2) NOT NULL,
  archived_by_buyer BOOLEAN DEFAULT FALSE,
  archived_by_shopper BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 建立 reviews 資料表（評價）
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  target_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. 建立 favorites 資料表（收藏）
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  wish_id UUID REFERENCES wish_requests(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, wish_id)
);

-- ============================================
-- 建立索引以提升查詢效能
-- ============================================

CREATE INDEX IF NOT EXISTS idx_wish_requests_buyer_id ON wish_requests(buyer_id);
CREATE INDEX IF NOT EXISTS idx_wish_requests_status ON wish_requests(status);
CREATE INDEX IF NOT EXISTS idx_wish_requests_created_at ON wish_requests(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_trips_shopper_id ON trips(shopper_id);
CREATE INDEX IF NOT EXISTS idx_trips_date ON trips(date);

CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_shopper_id ON orders(shopper_id);
CREATE INDEX IF NOT EXISTS idx_orders_wish_id ON orders(wish_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

CREATE INDEX IF NOT EXISTS idx_reviews_target_id ON reviews(target_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON reviews(reviewer_id);

CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_wish_id ON favorites(wish_id);

-- ============================================
-- 設定 Row Level Security (RLS) 政策
-- ============================================

-- 啟用 RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE wish_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- profiles: 所有人可讀，只能修改自己的資料
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone" 
  ON profiles FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" 
  ON profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- wish_requests: 所有人可讀，只有作者可修改/刪除
DROP POLICY IF EXISTS "Wishes are viewable by everyone" ON wish_requests;
CREATE POLICY "Wishes are viewable by everyone" 
  ON wish_requests FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Users can create wishes" ON wish_requests;
CREATE POLICY "Users can create wishes" 
  ON wish_requests FOR INSERT 
  WITH CHECK (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "Users can update own wishes" ON wish_requests;
CREATE POLICY "Users can update own wishes" 
  ON wish_requests FOR UPDATE 
  USING (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "Users can delete own wishes" ON wish_requests;
CREATE POLICY "Users can delete own wishes" 
  ON wish_requests FOR DELETE 
  USING (auth.uid() = buyer_id);

-- trips: 所有人可讀，只有作者可修改/刪除
DROP POLICY IF EXISTS "Trips are viewable by everyone" ON trips;
CREATE POLICY "Trips are viewable by everyone" 
  ON trips FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Users can create trips" ON trips;
CREATE POLICY "Users can create trips" 
  ON trips FOR INSERT 
  WITH CHECK (auth.uid() = shopper_id);

DROP POLICY IF EXISTS "Users can update own trips" ON trips;
CREATE POLICY "Users can update own trips" 
  ON trips FOR UPDATE 
  USING (auth.uid() = shopper_id);

DROP POLICY IF EXISTS "Users can delete own trips" ON trips;
CREATE POLICY "Users can delete own trips" 
  ON trips FOR DELETE 
  USING (auth.uid() = shopper_id);

-- orders: 只有買家和賣家可以看到自己的訂單
DROP POLICY IF EXISTS "Users can view their orders" ON orders;
CREATE POLICY "Users can view their orders" 
  ON orders FOR SELECT 
  USING (auth.uid() = buyer_id OR auth.uid() = shopper_id);

DROP POLICY IF EXISTS "Users can create orders" ON orders;
CREATE POLICY "Users can create orders" 
  ON orders FOR INSERT 
  WITH CHECK (auth.uid() = shopper_id OR auth.uid() = buyer_id);

DROP POLICY IF EXISTS "Users can update their orders" ON orders;
CREATE POLICY "Users can update their orders" 
  ON orders FOR UPDATE 
  USING (auth.uid() = buyer_id OR auth.uid() = shopper_id);

-- reviews: 所有人可讀，只有作者可新增
DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON reviews;
CREATE POLICY "Reviews are viewable by everyone" 
  ON reviews FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Users can create reviews" ON reviews;
CREATE POLICY "Users can create reviews" 
  ON reviews FOR INSERT 
  WITH CHECK (auth.uid() = reviewer_id);

-- favorites: 只能看到和操作自己的收藏
DROP POLICY IF EXISTS "Users can view own favorites" ON favorites;
CREATE POLICY "Users can view own favorites" 
  ON favorites FOR SELECT 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create favorites" ON favorites;
CREATE POLICY "Users can create favorites" 
  ON favorites FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own favorites" ON favorites;
CREATE POLICY "Users can delete own favorites" 
  ON favorites FOR DELETE 
  USING (auth.uid() = user_id);

-- ============================================
-- 建立觸發器：自動更新 updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_wish_requests_updated_at ON wish_requests;
CREATE TRIGGER update_wish_requests_updated_at 
  BEFORE UPDATE ON wish_requests 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_trips_updated_at ON trips;
CREATE TRIGGER update_trips_updated_at 
  BEFORE UPDATE ON trips 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at 
  BEFORE UPDATE ON orders 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 插入測試資料（可選）
-- ============================================

-- 注意：需要先有登入的使用者才能執行以下插入

-- 範例：插入測試許願單（請將 UUID 替換為實際的用戶 ID）
-- INSERT INTO wish_requests (title, description, budget, price, commission, target_country, deadline, buyer_id, status, images)
-- VALUES 
--   ('日本東京香蕉', '想要東京車站的東京香蕉，原味 8 入', 500, 400, 100, 'JP', '2025-12-31', '你的用戶UUID', 'open', ARRAY['https://example.com/image.jpg']),
--   ('韓國面膜', '想要韓國的 Mediheal 面膜 10 片', 300, 250, 50, 'KR', '2025-12-31', '你的用戶UUID', 'open', '{}');

-- 範例：插入測試行程
-- INSERT INTO trips (destination, date, description, shopper_id, shopper_name)
-- VALUES 
--   ('日本東京', '2025-12-25', '12月底去東京玩，可以幫忙代購喔！', '你的用戶UUID', '測試代購'),
--   ('韓國首爾', '2025-12-20', '聖誕節前去首爾，歡迎委託', '你的用戶UUID', '測試代購');

-- ============================================
-- 完成！
-- ============================================

