-- ============================================
-- 快速修復：完全移除 RLS 限制（開發環境用）
-- 複製全部內容到 Supabase SQL Editor 執行
-- ============================================

-- 步驟 1：刪除所有現有的 RLS 政策
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Wishes are viewable by everyone" ON wish_requests;
DROP POLICY IF EXISTS "Users can create wishes" ON wish_requests;
DROP POLICY IF EXISTS "Users can update own wishes" ON wish_requests;
DROP POLICY IF EXISTS "Users can delete own wishes" ON wish_requests;
DROP POLICY IF EXISTS "Trips are viewable by everyone" ON trips;
DROP POLICY IF EXISTS "Users can create trips" ON trips;
DROP POLICY IF EXISTS "Users can update own trips" ON trips;
DROP POLICY IF EXISTS "Users can delete own trips" ON trips;
DROP POLICY IF EXISTS "Users can view their orders" ON orders;
DROP POLICY IF EXISTS "Users can create orders" ON orders;
DROP POLICY IF EXISTS "Users can update their orders" ON orders;
DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON reviews;
DROP POLICY IF EXISTS "Users can create reviews" ON reviews;
DROP POLICY IF EXISTS "Users can view own favorites" ON favorites;
DROP POLICY IF EXISTS "Users can create favorites" ON favorites;
DROP POLICY IF EXISTS "Users can delete own favorites" ON favorites;

-- 步驟 2：完全關閉 RLS
ALTER TABLE IF EXISTS profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS wish_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS trips DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS reviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS favorites DISABLE ROW LEVEL SECURITY;

-- 步驟 3：授予 anon 和 authenticated 角色完整權限
GRANT ALL ON profiles TO anon, authenticated;
GRANT ALL ON wish_requests TO anon, authenticated;
GRANT ALL ON trips TO anon, authenticated;
GRANT ALL ON orders TO anon, authenticated;
GRANT ALL ON reviews TO anon, authenticated;
GRANT ALL ON favorites TO anon, authenticated;

-- 完成！現在所有資料表都可以自由讀寫了

