-- ============================================
-- 🔧 修復通知已讀功能 - 返回正確的 unread_count
-- ============================================

-- 🔧 必須先刪除舊函數（因為返回類型不同）
DROP FUNCTION IF EXISTS mark_notification_read(UUID);
DROP FUNCTION IF EXISTS mark_all_notifications_read();
DROP FUNCTION IF EXISTS get_unread_notification_count();
DROP FUNCTION IF EXISTS get_notification_unread_count();

-- 重建 mark_notification_read：返回更新結果和 unread_count
CREATE OR REPLACE FUNCTION mark_notification_read(p_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_updated BOOLEAN;
  v_unread_count INTEGER;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('updated', false, 'error', 'not_authenticated');
  END IF;
  
  -- 更新通知（is_read 和 read_at 同步）
  UPDATE notifications
  SET 
    is_read = TRUE,
    read_at = NOW()
  WHERE id = p_id
    AND user_id = v_user_id
    AND is_read = FALSE;
  
  v_updated := FOUND;
  
  -- 獲取最新 unread_count
  SELECT COUNT(*)::INTEGER INTO v_unread_count
  FROM notifications 
  WHERE user_id = v_user_id 
    AND is_read = FALSE;
  
  RETURN jsonb_build_object('updated', v_updated, 'unread_count', v_unread_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 重建 mark_all_notifications_read：返回更新後的 unread_count（應該是 0）
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS INTEGER AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN -1;
  END IF;
  
  -- 批量更新（is_read 和 read_at 同步）
  UPDATE notifications
  SET 
    is_read = TRUE,
    read_at = NOW()
  WHERE user_id = v_user_id
    AND is_read = FALSE;
  
  -- 返回 0（全部已讀）
  RETURN 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 確保 notifications 表有 is_read 欄位
ALTER TABLE notifications 
  ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;

-- 同步 is_read 與 read_at（修復可能不一致的資料）
UPDATE notifications 
SET is_read = TRUE 
WHERE read_at IS NOT NULL AND (is_read IS NULL OR is_read = FALSE);

UPDATE notifications 
SET is_read = FALSE 
WHERE read_at IS NULL AND (is_read IS NULL OR is_read = TRUE);

-- 🆕 添加別名函數，支援舊版參數名（向後兼容）
CREATE OR REPLACE FUNCTION get_unread_notification_count()
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER 
    FROM notifications 
    WHERE user_id = auth.uid() 
      AND is_read = FALSE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant 權限
GRANT EXECUTE ON FUNCTION mark_notification_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_all_notifications_read() TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_notification_count() TO authenticated;

SELECT '✅ Notification read functions fixed' AS status;
SELECT '✅ is_read and read_at are now synchronized' AS status;

