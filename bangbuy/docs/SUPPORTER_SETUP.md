# Supporter 訂閱系統設定指南

## 概述

Supporter 是 BangBuy 的自願性支持方案，使用者可透過 PayPal 訂閱每月 NT$60 來支持平台維運與開發。

## 系統架構

```
┌─────────────────────────────────────────────────────────────────┐
│                        前端 (Next.js)                           │
│  /supporter         - 方案介紹頁                                │
│  /supporter/checkout - 付款頁 (PayPal Subscribe Button)         │
│  /supporter/success  - 付款成功頁                               │
│  /supporter/error    - 付款失敗頁                               │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      後端 API (Next.js)                         │
│  POST /api/supporter/paypal/approve                             │
│  - 驗證用戶登入狀態                                             │
│  - 查詢 PayPal 訂閱狀態                                         │
│  - 確認 plan_id 與 status=ACTIVE                                │
│  - 更新 profiles.is_supporter                                   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Supabase Edge Function                        │
│  paypal-webhook                                                 │
│  - 驗證 PayPal webhook 簽名                                     │
│  - 處理訂閱狀態變更事件                                         │
│  - 自動更新/撤銷 Supporter 身分                                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Supabase Database                          │
│  profiles 表：                                                  │
│  - is_supporter, paypal_subscription_id, paypal_status, etc.    │
│  feature_flags 表：                                             │
│  - Early Access 功能控制                                        │
└─────────────────────────────────────────────────────────────────┘
```

## 設定步驟

### 1. 執行資料庫 Migration

在 Supabase SQL Editor 執行 `migration-supporter-paypal.sql`：

```sql
-- 確保 profiles 表有 Supporter 相關欄位
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS is_supporter BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS paypal_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS paypal_plan_id TEXT,
  ADD COLUMN IF NOT EXISTS paypal_status TEXT,
  ADD COLUMN IF NOT EXISTS supporter_since TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS supporter_updated_at TIMESTAMPTZ DEFAULT NOW();

-- 唯一索引（防止一個訂閱綁多人）
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_paypal_subscription_id_unique 
  ON profiles(paypal_subscription_id) 
  WHERE paypal_subscription_id IS NOT NULL;

-- feature_flags 表
CREATE TABLE IF NOT EXISTS feature_flags (
  key TEXT PRIMARY KEY,
  description TEXT,
  enabled_for TEXT NOT NULL CHECK (enabled_for IN ('public', 'member', 'supporter')),
  rollout_percentage INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 插入示例 flag
INSERT INTO feature_flags (key, description, enabled_for)
VALUES ('early_access_demo', 'Supporter Early Access 示範功能', 'supporter')
ON CONFLICT (key) DO NOTHING;
```

### 2. 設定 Vercel 環境變數

在 Vercel Dashboard → Settings → Environment Variables 設定：

| 變數名稱 | 說明 | 範例值 |
|---------|------|-------|
| `PAYPAL_CLIENT_ID` | PayPal Live Client ID | `AXx...` |
| `PAYPAL_CLIENT_SECRET` | PayPal Live Secret | `ELx...` |
| `PAYPAL_API_BASE` | PayPal API 基底 URL | `https://api-m.paypal.com` |
| `PAYPAL_PLAN_ID` | PayPal 訂閱方案 ID | `P-02S95485WR471912RNFEVHJY` |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | 前端用 PayPal Client ID | `AXx...` |
| `NEXT_PUBLIC_PAYPAL_PLAN_ID` | 前端用 Plan ID | `P-02S95485WR471912RNFEVHJY` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key | `eyJhbG...` |

### 3. 部署 Supabase Edge Function

```bash
# 安裝 Supabase CLI（如果尚未安裝）
npm install -g supabase

# 登入 Supabase
supabase login

# 連接專案
supabase link --project-ref iaizclcplchjhbfafkiy

# 部署 Edge Function
supabase functions deploy paypal-webhook --no-verify-jwt
```

### 4. 設定 Supabase Edge Function Secrets

在 Supabase Dashboard → Edge Functions → Secrets 設定：

| Secret 名稱 | 說明 |
|------------|------|
| `PAYPAL_CLIENT_ID` | PayPal Live Client ID |
| `PAYPAL_CLIENT_SECRET` | PayPal Live Secret |
| `PAYPAL_API_BASE` | `https://api-m.paypal.com` |
| `PAYPAL_WEBHOOK_ID` | PayPal Webhook ID（在 PayPal Developer 建立） |
| `SUPABASE_URL` | Supabase 專案 URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service Role Key |

### 5. 設定 PayPal Webhook

1. 前往 [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/)
2. 選擇 Live 環境
3. 建立 Webhook，URL 設為：
   ```
   https://iaizclcplchjhbfafkiy.functions.supabase.co/paypal-webhook
   ```
4. 訂閱以下事件：
   - `BILLING.SUBSCRIPTION.ACTIVATED`
   - `BILLING.SUBSCRIPTION.CANCELLED`
   - `BILLING.SUBSCRIPTION.SUSPENDED`
   - `BILLING.SUBSCRIPTION.EXPIRED`
5. 複製 Webhook ID 到 Edge Function Secrets

## 驗收檢查清單

- [ ] 未登入進 `/supporter/checkout` → 顯示登入提示
- [ ] 已登入但 `display_name` 空 → 要求去 `/profile` 設定，且不顯示 PayPal 按鈕
- [ ] 有 `display_name` → PayPal 按鈕可渲染且可完成訂閱流程
- [ ] onApprove 取得 subscriptionID → `/api/supporter/paypal/approve` 會查 PayPal 並更新 DB
- [ ] profiles 的 `is_supporter` 變 true 後，Header/Sidebar 立即顯示 Supporter 徽章
- [ ] 取消訂閱後 webhook 事件到達 → `is_supporter` 自動變 false，徽章消失

## 頁面路由

| 路由 | 功能 |
|-----|------|
| `/supporter` | 方案介紹頁 |
| `/supporter/checkout` | 付款頁（PayPal Subscribe Button） |
| `/supporter/success` | 付款成功頁 |
| `/supporter/error` | 付款失敗頁 |

## Feature Flags

使用 `hasAccess(user, flagKey)` 檢查用戶權限：

```typescript
import { hasAccess } from '@/lib/featureAccess';

const user = {
  isLoggedIn: true,
  isSupporter: profile.is_supporter,
  userId: profile.id,
};

const canAccess = await hasAccess(user, 'early_access_demo');
```

### enabled_for 值說明

| 值 | 說明 |
|---|------|
| `public` | 所有人可見 |
| `member` | 登入用戶可見 |
| `supporter` | Supporter 可見 |

## 故障排除

### PayPal 按鈕不顯示

1. 確認 `NEXT_PUBLIC_PAYPAL_CLIENT_ID` 已設定
2. 確認用戶已設定 `display_name`
3. 檢查瀏覽器 Console 是否有 SDK 載入錯誤

### Webhook 驗證失敗

1. 確認 `PAYPAL_WEBHOOK_ID` 正確
2. 確認使用 Live 環境（非 Sandbox）
3. 檢查 Edge Function logs

### Supporter 狀態未更新

1. 檢查 PayPal 訂閱狀態是否為 `ACTIVE`
2. 確認 `plan_id` 與 `PAYPAL_PLAN_ID` 一致
3. 檢查 API logs 是否有錯誤
















