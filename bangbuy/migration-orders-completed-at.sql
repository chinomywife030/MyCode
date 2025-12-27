-- ============================================
-- 🏁 為 orders 表添加 completed_at 欄位
-- Migration Script
-- 請在 Supabase SQL Editor 中執行
-- ============================================

SET search_path = public;

-- 添加 completed_at 欄位（如果不存在）
ALTER TABLE orders ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- 為已完成訂單設置 completed_at（如果為空）
UPDATE orders 
SET completed_at = updated_at 
WHERE status = 'completed' AND completed_at IS NULL;

-- 建立索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_orders_completed_at ON orders(completed_at DESC) WHERE status = 'completed';
CREATE INDEX IF NOT EXISTS idx_orders_status_completed ON orders(status) WHERE status = 'completed';

