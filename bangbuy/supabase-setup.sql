-- ========================================
-- BangBuy 資料庫完整設置腳本
-- ========================================
-- 使用說明：
-- 1. 登入 Supabase Dashboard (https://app.supabase.com)
-- 2. 選擇你的專案
-- 3. 點擊左側 "SQL Editor"
-- 4. 點擊 "New query"
-- 5. 複製此檔案的全部內容貼上
-- 6. 點擊 "Run" 執行
-- 7. 刷新你的網頁，許願單就會顯示！
-- ========================================

-- 清理舊資料（如果存在）
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS favorites CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS trips CASCADE;
DROP TABLE IF EXISTS wish_requests CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- ========================================
-- 1. 創建 profiles 表格（用戶資料）
-- ========================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  avatar_url TEXT,
  bio TEXT,
  verification_status TEXT DEFAULT 'unverified',
  rating_avg NUMERIC DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 2. 創建 wish_requests 表格（許願單）
-- ========================================
CREATE TABLE wish_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  target_country TEXT NOT NULL,
  budget NUMERIC NOT NULL,
  images TEXT[],
  status TEXT DEFAULT 'open',
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 創建索引以提高查詢效能
CREATE INDEX idx_wish_requests_status ON wish_requests(status);
CREATE INDEX idx_wish_requests_buyer ON wish_requests(buyer_id);
CREATE INDEX idx_wish_requests_created ON wish_requests(created_at DESC);

-- ========================================
-- 3. 創建 trips 表格（代購行程）
-- ========================================
CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopper_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  shopper_name TEXT,
  destination TEXT NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  capacity INTEGER DEFAULT 5,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 創建索引
CREATE INDEX idx_trips_shopper ON trips(shopper_id);
CREATE INDEX idx_trips_date ON trips(date);
CREATE INDEX idx_trips_status ON trips(status);

-- ========================================
-- 4. 創建 orders 表格（訂單）
-- ========================================
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wish_id UUID REFERENCES wish_requests(id) ON DELETE CASCADE,
  shopper_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  buyer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  price NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 創建索引
CREATE INDEX idx_orders_shopper ON orders(shopper_id);
CREATE INDEX idx_orders_buyer ON orders(buyer_id);
CREATE INDEX idx_orders_status ON orders(status);

-- ========================================
-- 5. 創建 reviews 表格（評價）
-- ========================================
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  target_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 創建索引
CREATE INDEX idx_reviews_target ON reviews(target_id);
CREATE INDEX idx_reviews_reviewer ON reviews(reviewer_id);

-- ========================================
-- 6. 創建 favorites 表格（收藏）
-- ========================================
CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  wish_id UUID REFERENCES wish_requests(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, wish_id)
);

-- 創建索引
CREATE INDEX idx_favorites_user ON favorites(user_id);
CREATE INDEX idx_favorites_wish ON favorites(wish_id);

-- ========================================
-- 7. 創建 messages 表格（聊天訊息）
-- ========================================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 創建索引
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_receiver ON messages(receiver_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);

-- ========================================
-- 8. 設定 Row Level Security (RLS) 政策
-- ========================================

-- 啟用 RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE wish_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- profiles: 允許所有人讀取
CREATE POLICY "Allow public read access to profiles"
  ON profiles FOR SELECT
  USING (true);

-- wish_requests: 允許讀取 open 狀態的許願單
CREATE POLICY "Allow public read access to open wishes"
  ON wish_requests FOR SELECT
  USING (status = 'open');

-- trips: 允許所有人讀取
CREATE POLICY "Allow public read access to trips"
  ON trips FOR SELECT
  USING (true);

-- orders: 允許相關用戶讀取
CREATE POLICY "Allow users to read their own orders"
  ON orders FOR SELECT
  USING (auth.uid() = shopper_id OR auth.uid() = buyer_id);

-- reviews: 允許所有人讀取
CREATE POLICY "Allow public read access to reviews"
  ON reviews FOR SELECT
  USING (true);

-- favorites: 允許用戶讀取和管理自己的收藏
CREATE POLICY "Allow users to manage their favorites"
  ON favorites FOR ALL
  USING (auth.uid() = user_id);

-- messages: 只允許相關用戶讀取
CREATE POLICY "Allow users to read their messages"
  ON messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- ========================================
-- 9. 插入測試資料
-- ========================================

-- 插入測試用戶
INSERT INTO profiles (id, name, email, avatar_url, bio, verification_status, rating_avg, rating_count) VALUES
  ('a0000000-0000-0000-0000-000000000001', '小明', 'ming@example.com', 'https://i.pravatar.cc/150?img=12', '熱愛旅遊的留學生，常往返台日之間', 'verified', 4.8, 15),
  ('a0000000-0000-0000-0000-000000000002', '小美', 'mei@example.com', 'https://i.pravatar.cc/150?img=5', '在美國讀書，可以幫忙代購', 'verified', 4.9, 23),
  ('a0000000-0000-0000-0000-000000000003', '阿傑', 'jay@example.com', 'https://i.pravatar.cc/150?img=33', '韓國留學生，喜歡幫朋友買東西', 'verified', 4.7, 8),
  ('a0000000-0000-0000-0000-000000000004', '莉莉', 'lily@example.com', 'https://i.pravatar.cc/150?img=9', '英國留學，經常回台灣', 'unverified', 0, 0),
  ('a0000000-0000-0000-0000-000000000005', '大熊', 'bear@example.com', 'https://i.pravatar.cc/150?img=52', '喜歡日本零食的買家', 'unverified', 0, 0);

-- 插入測試許願單
INSERT INTO wish_requests (id, buyer_id, title, description, target_country, budget, images, status, created_at) VALUES
  (
    'b0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000005',
    '日本北海道白色戀人巧克力',
    '想要經典的白色戀人巧克力禮盒，大盒裝最好！謝謝～',
    'JP',
    800,
    ARRAY['https://images.unsplash.com/photo-1511911063855-2bf39afa5b2e?w=400'],
    'open',
    NOW() - INTERVAL '2 days'
  ),
  (
    'b0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000005',
    '韓國 Innisfree 面膜組合',
    '想要 Innisfree 的綠茶面膜，至少 10 片以上',
    'KR',
    500,
    ARRAY['https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400'],
    'open',
    NOW() - INTERVAL '1 day'
  ),
  (
    'b0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000004',
    '美國 Nike Air Force 1',
    '想要白色的 Nike Air Force 1，US 9.5 號',
    'US',
    3500,
    ARRAY['https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=400'],
    'open',
    NOW() - INTERVAL '3 hours'
  ),
  (
    'b0000000-0000-0000-0000-000000000004',
    'a0000000-0000-0000-0000-000000000003',
    '英國 Jo Malone 香水',
    '想要 Jo Malone 的英國梨與小蒼蘭香水 100ml',
    'UK',
    2800,
    ARRAY['https://images.unsplash.com/photo-1541643600914-78b084683601?w=400'],
    'open',
    NOW() - INTERVAL '5 hours'
  ),
  (
    'b0000000-0000-0000-0000-000000000005',
    'a0000000-0000-0000-0000-000000000005',
    '日本一蘭拉麵泡麵',
    '想要一蘭拉麵的泡麵版本，5 包以上',
    'JP',
    600,
    ARRAY['https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400'],
    'open',
    NOW() - INTERVAL '12 hours'
  ),
  (
    'b0000000-0000-0000-0000-000000000006',
    'a0000000-0000-0000-0000-000000000004',
    '韓國 CU 便利商店限定零食組合',
    '想要韓國 CU 便利商店的限定零食，各種口味都可以',
    'KR',
    1000,
    ARRAY['https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=400'],
    'open',
    NOW() - INTERVAL '8 hours'
  );

-- 插入測試行程
INSERT INTO trips (id, shopper_id, shopper_name, destination, date, description, capacity, status, created_at) VALUES
  (
    'c0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    '小明',
    '🇯🇵 日本東京',
    CURRENT_DATE + INTERVAL '7 days',
    '下週要去東京旅遊，可以幫忙帶東西！藥妝、零食、服飾都可以～',
    5,
    'active',
    NOW() - INTERVAL '1 day'
  ),
  (
    'c0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000002',
    '小美',
    '🇺🇸 美國洛杉磯',
    CURRENT_DATE + INTERVAL '14 days',
    '兩週後回台灣，可以幫忙從美國帶東西，運動用品、保健品都 OK',
    3,
    'active',
    NOW() - INTERVAL '2 days'
  ),
  (
    'c0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000003',
    '阿傑',
    '🇰🇷 韓國首爾',
    CURRENT_DATE + INTERVAL '5 days',
    '這週末去首爾購物，可以幫忙帶美妝、服飾、零食',
    4,
    'active',
    NOW() - INTERVAL '6 hours'
  ),
  (
    'c0000000-0000-0000-0000-000000000004',
    'a0000000-0000-0000-0000-000000000004',
    '莉莉',
    '🇬🇧 英國倫敦',
    CURRENT_DATE + INTERVAL '21 days',
    '下個月回台灣，可以從英國帶精品、香水等',
    2,
    'active',
    NOW() - INTERVAL '3 hours'
  ),
  (
    'c0000000-0000-0000-0000-000000000005',
    'a0000000-0000-0000-0000-000000000001',
    '小明',
    '🇯🇵 日本大阪',
    CURRENT_DATE + INTERVAL '30 days',
    '下個月要去大阪，可以幫忙帶藥妝和零食',
    6,
    'active',
    NOW() - INTERVAL '10 hours'
  );

-- 插入一些測試訂單（已完成）
INSERT INTO orders (wish_id, shopper_id, buyer_id, price, status, completed_at) VALUES
  (
    'b0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000005',
    850,
    'completed',
    NOW() - INTERVAL '10 days'
  );

-- 插入測試評價
INSERT INTO reviews (order_id, reviewer_id, target_id, rating, comment) VALUES
  (
    (SELECT id FROM orders LIMIT 1),
    'a0000000-0000-0000-0000-000000000005',
    'a0000000-0000-0000-0000-000000000001',
    5,
    '服務很好！東西完整，包裝仔細，下次還會再請他幫忙！'
  );

-- ========================================
-- 完成！
-- ========================================
-- 設置完成！現在你可以：
-- 1. 關閉此 SQL Editor
-- 2. 回到你的網站 http://localhost:3000
-- 3. 刷新頁面
-- 4. 你應該會看到 6 個許願單和 5 個行程！
-- ========================================

SELECT '✅ 資料庫設置完成！' as status,
       (SELECT COUNT(*) FROM profiles) as profiles_count,
       (SELECT COUNT(*) FROM wish_requests) as wishes_count,
       (SELECT COUNT(*) FROM trips) as trips_count;
