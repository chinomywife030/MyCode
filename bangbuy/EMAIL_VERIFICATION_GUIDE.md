# 📧 Email 驗證系統使用指南

## 概述

本系統實現了完整的 Email 驗證流程，確保 Supabase 的 "Confirm Email" 功能開啟後，使用者體驗流暢且不會中斷。

---

## 🎯 功能特色

### 1. **註冊完成頁面** (`/auth/check-email`)
- 註冊成功後自動導向
- 顯示驗證信已寄出的提示
- 提供重新寄送驗證信功能（60 秒冷卻）
- 可檢查驗證狀態並自動跳轉
- 提供前往登入的快速連結

### 2. **Email 驗證頁面** (`/verify-email`)
- 已登入但未驗證時導向此頁
- 顯示目前登入的 email
- 重新寄送驗證信
- 重新檢查驗證狀態
- 登出功能

### 3. **全站 Auth Guard**
- 自動檢查登入狀態和 email 驗證狀態
- 未登入 → 導向 `/login`
- 已登入但未驗證 → 導向 `/verify-email`
- 白名單頁面不做導轉（避免無限 redirect）

### 4. **Realtime 穩定性**
- Auth 錯誤時自動停止重連（避免刷屏）
- Exponential backoff 重連策略
- 背景時暫停重試
- 登出時清理所有 channels

---

## 📋 使用流程

### 註冊流程

1. **使用者填寫註冊表單**
   - 輸入 email、密碼、暱稱
   - 點擊「免費註冊」

2. **系統處理**
   - 呼叫 `supabase.auth.signUp()`
   - 儲存 email 到 localStorage
   - 記錄條款同意資訊

3. **導向驗證頁**
   - 自動導向 `/auth/check-email?email=xxx`
   - 顯示「註冊成功，請驗證信箱」

4. **使用者操作**
   - 選項 A：前往信箱點擊驗證連結
   - 選項 B：重新寄送驗證信（有冷卻時間）
   - 選項 C：完成驗證後點擊「重新檢查」

5. **驗證完成**
   - 系統檢測到 `email_confirmed_at` 已存在
   - 自動導向首頁

---

### 登入流程

1. **使用者輸入帳密登入**

2. **系統檢查驗證狀態**
   - 若 `email_confirmed_at` 為 null → 導向 `/verify-email`
   - 若已驗證 → 導向首頁

3. **未驗證使用者**
   - 在 `/verify-email` 頁面重新寄送驗證信
   - 完成驗證後點擊「重新檢查」

---

## 🛡️ Auth Guard 行為

### 白名單頁面（不做導轉）
- `/login` - 登入頁
- `/auth/check-email` - 註冊完成頁
- `/verify-email` - Email 驗證頁
- `/forgot-password` - 忘記密碼
- `/reset-password` - 重設密碼
- `/auth/callback` - Auth 回調
- `/terms` - 服務條款
- `/privacy` - 隱私政策
- `/disclaimer` - 免責聲明
- `/copyright` - 版權聲明
- `/cookies` - Cookie 政策

### 公開頁面（不需登入）
- `/` - 首頁
- `/calculator` - 運費計算機
- 法律頁面

### 受保護頁面（需登入且已驗證）
- `/dashboard` - 會員中心
- `/chat` - 聊天室
- `/create` - 發布行程
- `/notifications` - 通知
- `/profile/:id` - 個人檔案
- 其他需要登入的頁面

---

## 🔧 技術實現

### 檔案結構

```
bangbuy/
├── app/
│   ├── auth/
│   │   ├── check-email/
│   │   │   └── page.tsx          # 註冊完成頁
│   │   └── callback/
│   │       └── route.ts           # Auth 回調處理
│   ├── verify-email/
│   │   └── page.tsx               # Email 驗證頁
│   └── login/
│       └── page.tsx               # 登入/註冊頁
├── components/
│   ├── EmailVerificationGuard.tsx # Auth Guard
│   └── Providers.tsx              # 全域 Providers
├── lib/
│   ├── AuthProvider.tsx           # Auth 狀態管理
│   ├── safeCall.ts                # 安全的 Supabase 呼叫
│   ├── AppStatusProvider.tsx      # 全域應用狀態
│   └── realtime/
│       └── simpleRealtime.ts      # Realtime 管理
```

### 關鍵功能

#### 1. 註冊後導向 (`app/login/page.tsx`)

```typescript
// 註冊成功後
localStorage.setItem('bangbuy_signup_email', email);
router.replace(`/auth/check-email?email=${encodeURIComponent(email)}`);
```

#### 2. 重新寄送驗證信 (`app/auth/check-email/page.tsx`)

```typescript
const { error } = await supabase.auth.resend({
  type: 'signup',
  email,
});
```

#### 3. 檢查驗證狀態

```typescript
const { data: { user } } = await supabase.auth.getUser();
if (user.email_confirmed_at) {
  // 已驗證，導向首頁
  router.replace('/');
}
```

#### 4. Auth Guard (`components/EmailVerificationGuard.tsx`)

```typescript
// 未登入
if (!user) {
  router.replace('/login');
  return;
}

// 已登入但未驗證
if (user && !emailVerified) {
  router.replace('/verify-email');
  return;
}
```

---

## 🧪 測試步驟

### 測試註冊流程

1. **開啟 Supabase Dashboard**
   - 進入 Authentication > Settings
   - 確認 "Enable email confirmations" 已開啟

2. **註冊新帳號**
   ```
   1. 前往 /login
   2. 切換到「註冊帳號」
   3. 輸入 email、密碼、暱稱
   4. 點擊「免費註冊」
   ```

3. **驗證導向**
   - ✅ 應該自動導向 `/auth/check-email?email=xxx`
   - ✅ 頁面顯示「註冊成功，請驗證信箱」
   - ✅ 顯示註冊的 email

4. **測試重新寄送**
   - 點擊「重新寄送驗證信」
   - ✅ 應該顯示成功訊息
   - ✅ 按鈕變為「請稍候 60 秒」
   - ✅ 60 秒後才能再次點擊

5. **檢查信箱**
   - 前往註冊的信箱
   - 點擊驗證連結
   - ✅ 應該導向首頁

6. **測試重新檢查**
   - 在 `/auth/check-email` 頁面
   - 點擊「我已完成驗證，重新檢查」
   - ✅ 若已驗證，顯示成功並跳轉首頁
   - ✅ 若未驗證，顯示「尚未完成驗證」

---

### 測試 Auth Guard

1. **未驗證使用者嘗試訪問受保護頁面**
   ```
   1. 註冊後不驗證
   2. 嘗試前往 /dashboard
   ```
   - ✅ 應該被導向 `/verify-email`

2. **手動輸入 URL**
   ```
   1. 在瀏覽器輸入 /chat
   2. 在瀏覽器輸入 /create
   ```
   - ✅ 未登入：導向 `/login`
   - ✅ 已登入但未驗證：導向 `/verify-email`

3. **白名單頁面**
   ```
   1. 前往 /login
   2. 前往 /auth/check-email
   3. 前往 /verify-email
   ```
   - ✅ 不會被導轉

---

### 測試登入流程

1. **未驗證帳號登入**
   ```
   1. 註冊後不驗證
   2. 登出
   3. 重新登入
   ```
   - ✅ 應該導向 `/verify-email`

2. **已驗證帳號登入**
   ```
   1. 使用已驗證的帳號登入
   ```
   - ✅ 應該導向首頁

---

### 測試 Realtime 穩定性

1. **切換頁面**
   ```
   1. 登入後進入 /chat
   2. 切換到其他頁面
   3. 再切回 /chat
   ```
   - ✅ 不會失靈
   - ✅ Console 不會無限刷 reconnect log

2. **切到背景**
   ```
   1. 在 /chat 頁面
   2. 切換到其他應用程式（背景）
   3. 等待 1 分鐘
   4. 切回瀏覽器
   ```
   - ✅ 不會狂重連
   - ✅ 自動恢復連線

3. **Token 過期**
   ```
   1. 登入後
   2. 在 Supabase Dashboard 手動刪除 session
   3. 在網站進行任何操作
   ```
   - ✅ 自動登出並導向 `/login`
   - ✅ 不會卡在 loading

---

## 📱 UI 設計

### 顏色系統
- **主色**：藍色 (`blue-600`)
- **成功**：綠色 (`green-50`, `green-600`)
- **錯誤**：紅色 (`red-50`, `red-600`)
- **資訊**：藍色 (`blue-50`, `blue-600`)

### 響應式設計
- 使用 Tailwind CSS
- 最大寬度 `max-w-md`（適合手機）
- 圓角 `rounded-2xl`
- 陰影 `shadow-xl`

### 按鈕狀態
- **主要按鈕**：藍色背景，白色文字
- **次要按鈕**：白色背景，灰色邊框
- **禁用狀態**：灰色，不可點擊
- **冷卻狀態**：顯示倒數計時

---

## 🐛 常見問題

### Q1: 註冊後沒有收到驗證信？

**A:** 
1. 檢查垃圾郵件匣
2. 等待 1-3 分鐘（可能延遲）
3. 點擊「重新寄送驗證信」
4. 確認 Supabase Email 設定正確

### Q2: 點擊驗證連結後沒有反應？

**A:**
1. 確認 `emailRedirectTo` 設定正確
2. 檢查 `/auth/callback/route.ts` 是否正確處理
3. 查看瀏覽器 Console 是否有錯誤

### Q3: 一直被導向 `/verify-email`？

**A:**
1. 確認 email 已驗證（檢查 Supabase Dashboard）
2. 點擊「重新檢查」按鈕
3. 嘗試登出再登入

### Q4: Realtime 一直重連？

**A:**
1. 檢查是否有 auth 錯誤
2. 確認 token 未過期
3. 查看 Console 的錯誤訊息

---

## 🚀 部署注意事項

### Supabase 設定

1. **Email Templates**
   - 設定驗證信的樣式
   - 確認 redirect URL 正確

2. **Auth Settings**
   - Enable email confirmations: ✅
   - Confirm email: ✅
   - Site URL: `https://yourdomain.com`
   - Redirect URLs: `https://yourdomain.com/auth/callback`

3. **Environment Variables**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```

---

## 📚 相關文件

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Email Verification Guide](https://supabase.com/docs/guides/auth/auth-email)
- [Next.js App Router](https://nextjs.org/docs/app)

---

## ✅ 驗收清單

- [x] 註冊後自動導向 `/auth/check-email`
- [x] 顯示註冊的 email
- [x] 重新寄送驗證信功能（60 秒冷卻）
- [x] 前往登入按鈕
- [x] 重新檢查驗證狀態
- [x] 未驗證使用者無法進入受保護頁面
- [x] Auth Guard 正確導轉
- [x] 白名單頁面不會無限跳轉
- [x] Realtime 不會無限重連
- [x] Token 過期自動登出
- [x] UI 在手機上顯示良好

---

**最後更新：** 2025-12-16








