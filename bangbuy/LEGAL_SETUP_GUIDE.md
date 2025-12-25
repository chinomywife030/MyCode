# 🔐 BangBuy 法務系統使用指南

## 快速開始

### 1️⃣ 執行資料庫遷移（必做）

登入 Supabase Dashboard → SQL Editor → 執行以下腳本：

```sql
-- 執行檔案：migration-add-terms-fields.sql
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS terms_version TEXT;

-- 為現有用戶設定預設值（可選）
UPDATE profiles 
SET 
  terms_accepted_at = created_at,
  terms_version = '2025-12-13'
WHERE terms_accepted_at IS NULL;
```

---

## 2️⃣ 測試驗收

### ✅ 註冊/登入頁測試
1. 訪問 `/login`
2. 切換到「註冊帳號」
3. **不勾選**同意 checkbox → 註冊按鈕應該是灰色且無法點擊
4. 勾選同意 → 按鈕變藍色可點擊
5. 完成註冊 → 檢查 Supabase `profiles` 表是否有 `terms_accepted_at` 記錄

### ✅ Cookie Banner 測試
1. 開啟無痕視窗或清除 localStorage：
   ```javascript
   localStorage.removeItem('bangbuy_cookie_consent');
   ```
2. 訪問首頁 → 底部應顯示 Cookie Banner
3. 點擊「我同意」→ Banner 消失
4. 重新整理 → Banner 不再顯示

### ✅ 發布頁測試
1. 訪問 `/create`（許願單）或 `/trips/create`（行程）
2. 捲動到發布按鈕上方 → 應看到黃色警告區塊
3. 點擊《使用條款》連結 → 開啟 `/terms` 新分頁

### ✅ 聊天頁測試
1. 訪問 `/chat`
2. 選擇任意對話
3. 訊息輸入框上方應顯示紅色防詐提醒（永久顯示）

### ✅ Footer 測試
1. 訪問任意頁面（首頁、會員中心、計算器等）
2. 捲動到頁面底部 → 應看到 Footer
3. 點擊「法律聲明」區塊的 5 個連結 → 全部可開啟

---

## 3️⃣ 法務頁面內容更新

如需修改條款內容，直接編輯以下檔案：

- **使用條款：** `bangbuy/app/terms/page.tsx`
- **免責聲明：** `bangbuy/app/disclaimer/page.tsx`
- **隱私權政策：** `bangbuy/app/privacy/page.tsx`
- **Cookie 政策：** `bangbuy/app/cookies/page.tsx`
- **智慧財產權：** `bangbuy/app/copyright/page.tsx`

**記得更新「Last updated」日期！**

---

## 4️⃣ 版本更新流程

當條款更新時：

1. 修改對應的法務頁面檔案
2. 更新 `Last updated` 日期
3. 修改版本號：
   - `bangbuy/app/login/page.tsx` 中的 `terms_version`
   - `bangbuy/components/CookieBanner.tsx` 中的 `CONSENT_VERSION`
4. 用戶下次登入/訪問時會看到新版本

---

## 5️⃣ 常見問題

### Q: 用戶忘記勾選就想註冊怎麼辦？
A: 按鈕會保持 disabled 狀態，並顯示紅字提示「請先勾選同意條款後再註冊」。

### Q: Cookie Banner 一直顯示？
A: 檢查 localStorage 是否被瀏覽器阻擋。可在 Console 輸入：
```javascript
localStorage.setItem('bangbuy_cookie_consent', JSON.stringify({
  accepted: true,
  timestamp: new Date().toISOString(),
  version: '2025-12-13'
}));
```

### Q: 如何追蹤哪些用戶同意了條款？
A: 查詢 Supabase `profiles` 表：
```sql
SELECT id, name, terms_accepted_at, terms_version 
FROM profiles 
WHERE terms_accepted_at IS NOT NULL
ORDER BY terms_accepted_at DESC;
```

### Q: 外部連結的 tooltip 沒顯示？
A: 檢查是否使用了 `ExternalLink` 組件且 `showWarning={true}`。

---

## 6️⃣ 技術架構

```
法務系統架構
├── 法務頁面（5 個獨立路由）
│   ├── /terms
│   ├── /disclaimer
│   ├── /privacy
│   ├── /cookies
│   └── /copyright
│
├── 共用組件
│   ├── LegalConsentBlock（註冊/登入同意）
│   ├── Footer（全站法務入口）
│   ├── CookieBanner（GDPR 合規）
│   └── ExternalLink（第三方免責）
│
├── 資料庫
│   ├── profiles.terms_accepted_at（同意時間）
│   └── profiles.terms_version（條款版本）
│
└── localStorage
    ├── bangbuy_cookie_consent（Cookie 同意）
    └── bangbuy_terms_accepted（條款備份）
```

---

## 7️⃣ 檢查清單

部署前請確認：

- [ ] 資料庫遷移已執行
- [ ] 所有法務頁面可正常訪問
- [ ] 註冊頁強制勾選正常運作
- [ ] Cookie Banner 首次顯示正常
- [ ] Footer 在所有頁面可見
- [ ] 發布頁顯示內容合法提示
- [ ] 聊天頁顯示防詐提醒
- [ ] 手機版所有提示位置正確

---

**完成後，BangBuy 已具備完整的法律保護機制！** 🎉

如有問題，請參考 `LEGAL_COMPLIANCE_REPORT.md` 詳細報告。

















