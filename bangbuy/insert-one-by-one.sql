-- 一次插入一筆，確保成功
-- 在 Supabase SQL Editor 執行

-- 第 1 步：清空舊資料
TRUNCATE wish_requests CASCADE;
TRUNCATE trips CASCADE;

-- 第 2 步：插入第一筆許願單
INSERT INTO wish_requests (title, budget, target_country, status, buyer_id) 
VALUES ('日本 Pocky 草莓味', 500, 'JP', 'open', '00000000-0000-0000-0000-000000000000');

-- 第 3 步：插入第二筆許願單
INSERT INTO wish_requests (title, budget, target_country, status, buyer_id) 
VALUES ('韓國面膜', 800, 'KR', 'open', '00000000-0000-0000-0000-000000000000');

-- 第 4 步：插入第三筆許願單
INSERT INTO wish_requests (title, budget, target_country, status, buyer_id) 
VALUES ('Switch 遊戲', 1800, 'JP', 'open', '00000000-0000-0000-0000-000000000000');

-- 第 5 步：插入第一筆行程
INSERT INTO trips (destination, date, shopper_id, shopper_name) 
VALUES ('東京, 日本', '2025-12-15', '00000000-0000-0000-0000-000000000000', '小明');

-- 第 6 步：插入第二筆行程
INSERT INTO trips (destination, date, shopper_id, shopper_name) 
VALUES ('首爾, 韓國', '2025-12-20', '00000000-0000-0000-0000-000000000000', '小美');

-- 第 7 步：插入第三筆行程
INSERT INTO trips (destination, date, shopper_id, shopper_name) 
VALUES ('紐約, 美國', '2026-01-10', '00000000-0000-0000-0000-000000000000', '大雄');

-- 第 8 步：驗證
SELECT COUNT(*) as wish_count FROM wish_requests;
SELECT COUNT(*) as trip_count FROM trips;

-- 第 9 步：查看實際資料
SELECT id, title, budget, status FROM wish_requests LIMIT 5;
SELECT id, destination, date, shopper_name FROM trips LIMIT 5;

