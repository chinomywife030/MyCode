# Edge Function 部署指南

## 方法 1：使用 Supabase CLI（推薦）

### 步驟

1. **安裝 Supabase CLI**
```bash
npm install -g supabase
```

2. **登入 Supabase**
```bash
supabase login
```

3. **連接專案**
```bash
cd bangbuy
supabase link --project-ref iaizclcplchjhbfafkiy
```

4. **部署 Edge Function**
```bash
supabase functions deploy paypal-webhook --no-verify-jwt
```

## 方法 2：使用 Supabase Dashboard

### ⚠️ 注意事項

如果在 Dashboard 中編輯，請確保：

1. **完全清除舊內容**：先全選刪除所有內容
2. **複製完整程式碼**：從 `supabase/functions/paypal-webhook/index.ts` 複製
3. **不要添加任何額外文字**：確保檔案開頭就是 `import`，結尾是 `});`
4. **檢查語法**：確保沒有多餘的字符或註解

### 正確的檔案開頭應該是：

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
```

### ❌ 錯誤範例（會導致部署失敗）：

```
supabase login ~~~~~  ← 不要添加這些
import { serve } ...
```

## 方法 3：使用 Supabase CLI 直接上傳

如果 Dashboard 有問題，可以直接用 CLI 上傳：

```bash
# 確保在專案根目錄
cd bangbuy

# 部署
supabase functions deploy paypal-webhook \
  --project-ref iaizclcplchjhbfafkiy \
  --no-verify-jwt
```

## 設定 Secrets

部署後，在 Supabase Dashboard → Edge Functions → paypal-webhook → Settings → Secrets 設定：

- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `PAYPAL_API_BASE` = `https://api-m.paypal.com`
- `PAYPAL_WEBHOOK_ID`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## 驗證部署

部署成功後，檢查：

1. Dashboard 中顯示 "Deployed"
2. Logs 中沒有錯誤
3. 可以測試 webhook URL：
   ```
   https://iaizclcplchjhbfafkiy.functions.supabase.co/paypal-webhook
   ```

## 常見錯誤

### 錯誤：`Expected ';', '}' or <eof>`

**原因**：檔案中有語法錯誤或額外字符

**解決**：
1. 完全清除 Dashboard 編輯器中的內容
2. 重新複製 `index.ts` 的完整內容
3. 確保沒有多餘的文字或註解

### 錯誤：`Failed to bundle the function`

**原因**：import 路徑錯誤或 Deno 版本問題

**解決**：使用 CLI 部署，CLI 會自動處理依賴




