-- 簡單的測試資料插入腳本
-- 在 Supabase SQL Editor 中執行

-- 1. 刪除舊資料（如果有的話）
DELETE FROM wish_requests;
DELETE FROM trips;

-- 2. 插入許願單測試資料（使用固定的 UUID）
INSERT INTO wish_requests (
  id,
  title,
  description,
  budget,
  target_country,
  category,
  status,
  buyer_id,
  created_at
) VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    '日本限定 Pocky 草莓味',
    '想要日本限定的草莓 Pocky，台灣買不到',
    500,
    'JP',
    '零食',
    'open',
    '00000000-0000-0000-0000-000000000000',
    NOW()
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    '韓國 Innisfree 面膜',
    '綠茶面膜 10 片裝',
    800,
    'KR',
    '美妝',
    'open',
    '00000000-0000-0000-0000-000000000000',
    NOW()
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'Switch 遊戲卡帶',
    '薩爾達傳說：王國之淚',
    1800,
    'JP',
    '遊戲',
    'open',
    '00000000-0000-0000-0000-000000000000',
    NOW()
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    'UNIQLO 限定 T-shirt',
    '聯名款 T-shirt Size M',
    600,
    'JP',
    '服飾',
    'open',
    '00000000-0000-0000-0000-000000000000',
    NOW()
  ),
  (
    '55555555-5555-5555-5555-555555555555',
    '美國 Bath & Body Works 香氛蠟燭',
    'Vanilla Bean Noel 香味',
    900,
    'US',
    '居家',
    'open',
    '00000000-0000-0000-0000-000000000000',
    NOW()
  );

-- 3. 插入行程測試資料
INSERT INTO trips (
  id,
  destination,
  date,
  description,
  shopper_id,
  shopper_name,
  created_at
) VALUES
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '東京, 日本',
    '2025-12-15',
    '聖誕節去東京玩，可以順便幫帶',
    '00000000-0000-0000-0000-000000000000',
    '小明',
    NOW()
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '首爾, 韓國',
    '2025-12-20',
    '去首爾跨年，行李箱還有空間',
    '00000000-0000-0000-0000-000000000000',
    '小美',
    NOW()
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '紐約, 美國',
    '2026-01-10',
    '寒假去美國玩一個月',
    '00000000-0000-0000-0000-000000000000',
    '大雄',
    NOW()
  );

-- 4. 驗證插入成功
SELECT 'Wishes:', COUNT(*) FROM wish_requests;
SELECT 'Trips:', COUNT(*) FROM trips;

