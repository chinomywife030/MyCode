-- ============================================
-- 建立 countries 資料表
-- 請在 Supabase SQL Editor 中執行此腳本
-- ============================================

-- 1. 建立 countries 資料表
CREATE TABLE IF NOT EXISTS countries (
  code TEXT PRIMARY KEY,
  name_zh TEXT NOT NULL,
  name_en TEXT,
  emoji TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 建立索引
CREATE INDEX IF NOT EXISTS idx_countries_is_active ON countries(is_active);
CREATE INDEX IF NOT EXISTS idx_countries_sort_order ON countries(sort_order);

-- 3. 插入國家資料（熱門國家優先）
INSERT INTO countries (code, name_zh, name_en, emoji, is_active, sort_order) VALUES
-- 熱門（1-6）
('JP', '日本', 'Japan', '🇯🇵', TRUE, 1),
('KR', '韓國', 'South Korea', '🇰🇷', TRUE, 2),
('US', '美國', 'United States', '🇺🇸', TRUE, 3),
('DE', '德國', 'Germany', '🇩🇪', TRUE, 4),
('UK', '英國', 'United Kingdom', '🇬🇧', TRUE, 5),
('FR', '法國', 'France', '🇫🇷', TRUE, 6),
-- 歐洲（7-22）
('IT', '義大利', 'Italy', '🇮🇹', TRUE, 7),
('ES', '西班牙', 'Spain', '🇪🇸', TRUE, 8),
('NL', '荷蘭', 'Netherlands', '🇳🇱', TRUE, 9),
('BE', '比利時', 'Belgium', '🇧🇪', TRUE, 10),
('CH', '瑞士', 'Switzerland', '🇨🇭', TRUE, 11),
('AT', '奧地利', 'Austria', '🇦🇹', TRUE, 12),
('CZ', '捷克', 'Czech Republic', '🇨🇿', TRUE, 13),
('PL', '波蘭', 'Poland', '🇵🇱', TRUE, 14),
('SE', '瑞典', 'Sweden', '🇸🇪', TRUE, 15),
('NO', '挪威', 'Norway', '🇳🇴', TRUE, 16),
('DK', '丹麥', 'Denmark', '🇩🇰', TRUE, 17),
('FI', '芬蘭', 'Finland', '🇫🇮', TRUE, 18),
('IE', '愛爾蘭', 'Ireland', '🇮🇪', TRUE, 19),
('PT', '葡萄牙', 'Portugal', '🇵🇹', TRUE, 20),
('GR', '希臘', 'Greece', '🇬🇷', TRUE, 21),
('HU', '匈牙利', 'Hungary', '🇭🇺', TRUE, 22),
-- 北美/大洋洲（23-25）
('CA', '加拿大', 'Canada', '🇨🇦', TRUE, 23),
('AU', '澳洲', 'Australia', '🇦🇺', TRUE, 24),
('NZ', '紐西蘭', 'New Zealand', '🇳🇿', TRUE, 25),
-- 亞洲（26-36）
('TW', '台灣', 'Taiwan', '🇹🇼', TRUE, 26),
('HK', '香港', 'Hong Kong', '🇭🇰', TRUE, 27),
('MO', '澳門', 'Macau', '🇲🇴', TRUE, 28),
('SG', '新加坡', 'Singapore', '🇸🇬', TRUE, 29),
('TH', '泰國', 'Thailand', '🇹🇭', TRUE, 30),
('VN', '越南', 'Vietnam', '🇻🇳', TRUE, 31),
('MY', '馬來西亞', 'Malaysia', '🇲🇾', TRUE, 32),
('ID', '印尼', 'Indonesia', '🇮🇩', TRUE, 33),
('PH', '菲律賓', 'Philippines', '🇵🇭', TRUE, 34),
('CN', '中國', 'China', '🇨🇳', TRUE, 35),
('IN', '印度', 'India', '🇮🇳', TRUE, 36),
-- 中東（37）
('AE', '阿聯酋', 'United Arab Emirates', '🇦🇪', TRUE, 37)
ON CONFLICT (code) DO UPDATE SET
  name_zh = EXCLUDED.name_zh,
  name_en = EXCLUDED.name_en,
  emoji = EXCLUDED.emoji,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

-- 4. 設定 RLS 政策（允許公開讀取）
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;

-- 允許所有人讀取（公開資料）
CREATE POLICY "Countries are publicly readable"
  ON countries FOR SELECT
  USING (is_active = TRUE);

-- 5. 建立更新時間觸發器
CREATE OR REPLACE FUNCTION update_countries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_countries_updated_at
  BEFORE UPDATE ON countries
  FOR EACH ROW
  EXECUTE FUNCTION update_countries_updated_at();

-- 完成
SELECT 'Countries table created and populated successfully!' AS message;




