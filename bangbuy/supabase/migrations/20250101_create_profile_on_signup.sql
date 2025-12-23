-- ============================================
-- 自動建立 profiles 記錄 Trigger
-- 當新用戶註冊到 auth.users 時，自動在 public.profiles 建立對應記錄
-- ============================================

-- 1. 建立 function：public.handle_new_user()
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_name TEXT;
  user_avatar_url TEXT;
BEGIN
  -- 從 raw_user_meta_data 或 email 取得 name
  -- 優先順序：display_name > name > email 前綴 > email
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'name',
    SPLIT_PART(NEW.email, '@', 1),
    NEW.email
  );

  -- 從 raw_user_meta_data 取得 avatar_url（若沒有就 null）
  user_avatar_url := NEW.raw_user_meta_data->>'avatar_url';

  -- 使用 INSERT ... ON CONFLICT 確保重複不會炸，也能補齊 name/avatar
  INSERT INTO public.profiles (
    id,
    name,
    display_name,
    avatar_url,
    role,
    verification_status,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    user_name,
    COALESCE(NEW.raw_user_meta_data->>'display_name', user_name), -- display_name 優先使用 metadata，否則用 name
    user_avatar_url,
    'buyer', -- 預設角色
    'unverified', -- 預設驗證狀態
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    -- 如果現有記錄的 name 為空，則更新
    name = COALESCE(profiles.name, EXCLUDED.name),
    -- 如果現有記錄的 display_name 為空，則更新
    display_name = COALESCE(profiles.display_name, EXCLUDED.display_name),
    -- 如果現有記錄的 avatar_url 為空，則更新
    avatar_url = COALESCE(profiles.avatar_url, EXCLUDED.avatar_url),
    -- 更新 updated_at
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 建立 trigger：當 auth.users 新增時自動執行
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 3. 完成訊息
SELECT 'Migration completed: Auto-create profiles trigger created' AS status;



