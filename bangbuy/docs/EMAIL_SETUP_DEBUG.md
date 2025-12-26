# 📧 Email 發送問題排查指南

## 問題：測試 Email 返回成功但沒收到

### 症狀
- API 返回 `{"success": true, "messageId": "dev-1766453428631"}`
- 但實際上沒有收到 Email

### 原因
`messageId` 以 `dev-` 開頭表示 Email 被**模擬發送**了，沒有真正寄出。

### 解決方法

#### 1. 檢查 `.env.local` 檔案

確保以下環境變數已正確設定：

```env
# 必須設定為 "true"（字串）
EMAIL_SEND_IN_DEV=true

# 必須設定 Resend API Key
RESEND_API_KEY=re_xxxxxxxxxxxxx

# 必須設定發送者 Email（域名需在 Resend 驗證）
EMAIL_FROM=noreply@bangbuy.app
```

**重要**：
- `EMAIL_SEND_IN_DEV` 必須是字串 `"true"`，不是布林值
- 設定後需要**重啟開發伺服器**（`npm run dev`）

#### 2. 驗證環境變數是否生效

重新呼叫測試 API，檢查返回的 `envCheck`：

```bash
curl "http://localhost:3000/api/test-email?to=your@email.com"
```

返回應該包含：
```json
{
  "success": true,
  "simulated": false,  // 應該是 false
  "envCheck": {
    "NODE_ENV": "development",
    "EMAIL_SEND_IN_DEV": true,  // 應該是 true
    "RESEND_API_KEY": true,     // 應該是 true
    "EMAIL_FROM": true           // 應該是 true
  }
}
```

如果 `EMAIL_SEND_IN_DEV` 是 `false`，表示環境變數沒有正確讀取。

#### 3. 檢查 Terminal 日誌

查看開發伺服器的 console 輸出：

```
[test-email] Environment check: {
  NODE_ENV: 'development',
  EMAIL_SEND_IN_DEV: false,  // ❌ 這裡應該是 true
  RESEND_API_KEY: true,
  EMAIL_FROM: true
}
[test-email] ⚠️ EMAIL_SEND_IN_DEV is not "true" - Email will be simulated!
```

#### 4. 常見錯誤

**錯誤 1：環境變數格式錯誤**
```env
# ❌ 錯誤
EMAIL_SEND_IN_DEV=true
EMAIL_SEND_IN_DEV=1
EMAIL_SEND_IN_DEV=True

# ✅ 正確
EMAIL_SEND_IN_DEV=true
```

**錯誤 2：檔案位置錯誤**
- `.env.local` 必須在**專案根目錄**（與 `package.json` 同層）
- 不是 `bangbuy/.env.local`，而是 `MyCode/bangbuy/.env.local`

**錯誤 3：沒有重啟伺服器**
- 修改 `.env.local` 後必須重啟 `npm run dev`

#### 5. 完整檢查清單

- [ ] `.env.local` 檔案存在於專案根目錄
- [ ] `EMAIL_SEND_IN_DEV=true`（字串 "true"）
- [ ] `RESEND_API_KEY` 已設定且有效
- [ ] `EMAIL_FROM` 已設定且域名已在 Resend 驗證
- [ ] 已重啟開發伺服器
- [ ] Terminal 日誌顯示 `EMAIL_SEND_IN_DEV: true`
- [ ] API 返回 `"simulated": false`

#### 6. 如果還是沒收到

檢查 Resend Dashboard：
1. 登入 https://resend.com
2. 查看 "Logs" 頁面
3. 確認是否有發送記錄
4. 檢查是否有錯誤訊息（例如：域名未驗證、API Key 無效）

#### 7. 測試生產環境

如果開發環境測試成功，但生產環境有問題：
- 檢查 Vercel 環境變數設定
- 確認 `EMAIL_SEND_IN_DEV` 在生產環境不需要設定（生產環境會自動發送）




## 問題：測試 Email 返回成功但沒收到

### 症狀
- API 返回 `{"success": true, "messageId": "dev-1766453428631"}`
- 但實際上沒有收到 Email

### 原因
`messageId` 以 `dev-` 開頭表示 Email 被**模擬發送**了，沒有真正寄出。

### 解決方法

#### 1. 檢查 `.env.local` 檔案

確保以下環境變數已正確設定：

```env
# 必須設定為 "true"（字串）
EMAIL_SEND_IN_DEV=true

# 必須設定 Resend API Key
RESEND_API_KEY=re_xxxxxxxxxxxxx

# 必須設定發送者 Email（域名需在 Resend 驗證）
EMAIL_FROM=noreply@bangbuy.app
```

**重要**：
- `EMAIL_SEND_IN_DEV` 必須是字串 `"true"`，不是布林值
- 設定後需要**重啟開發伺服器**（`npm run dev`）

#### 2. 驗證環境變數是否生效

重新呼叫測試 API，檢查返回的 `envCheck`：

```bash
curl "http://localhost:3000/api/test-email?to=your@email.com"
```

返回應該包含：
```json
{
  "success": true,
  "simulated": false,  // 應該是 false
  "envCheck": {
    "NODE_ENV": "development",
    "EMAIL_SEND_IN_DEV": true,  // 應該是 true
    "RESEND_API_KEY": true,     // 應該是 true
    "EMAIL_FROM": true           // 應該是 true
  }
}
```

如果 `EMAIL_SEND_IN_DEV` 是 `false`，表示環境變數沒有正確讀取。

#### 3. 檢查 Terminal 日誌

查看開發伺服器的 console 輸出：

```
[test-email] Environment check: {
  NODE_ENV: 'development',
  EMAIL_SEND_IN_DEV: false,  // ❌ 這裡應該是 true
  RESEND_API_KEY: true,
  EMAIL_FROM: true
}
[test-email] ⚠️ EMAIL_SEND_IN_DEV is not "true" - Email will be simulated!
```

#### 4. 常見錯誤

**錯誤 1：環境變數格式錯誤**
```env
# ❌ 錯誤
EMAIL_SEND_IN_DEV=true
EMAIL_SEND_IN_DEV=1
EMAIL_SEND_IN_DEV=True

# ✅ 正確
EMAIL_SEND_IN_DEV=true
```

**錯誤 2：檔案位置錯誤**
- `.env.local` 必須在**專案根目錄**（與 `package.json` 同層）
- 不是 `bangbuy/.env.local`，而是 `MyCode/bangbuy/.env.local`

**錯誤 3：沒有重啟伺服器**
- 修改 `.env.local` 後必須重啟 `npm run dev`

#### 5. 完整檢查清單

- [ ] `.env.local` 檔案存在於專案根目錄
- [ ] `EMAIL_SEND_IN_DEV=true`（字串 "true"）
- [ ] `RESEND_API_KEY` 已設定且有效
- [ ] `EMAIL_FROM` 已設定且域名已在 Resend 驗證
- [ ] 已重啟開發伺服器
- [ ] Terminal 日誌顯示 `EMAIL_SEND_IN_DEV: true`
- [ ] API 返回 `"simulated": false`

#### 6. 如果還是沒收到

檢查 Resend Dashboard：
1. 登入 https://resend.com
2. 查看 "Logs" 頁面
3. 確認是否有發送記錄
4. 檢查是否有錯誤訊息（例如：域名未驗證、API Key 無效）

#### 7. 測試生產環境

如果開發環境測試成功，但生產環境有問題：
- 檢查 Vercel 環境變數設定
- 確認 `EMAIL_SEND_IN_DEV` 在生產環境不需要設定（生產環境會自動發送）









