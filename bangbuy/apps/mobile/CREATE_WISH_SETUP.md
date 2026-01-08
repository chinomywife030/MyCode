# CreateWishScreen 設定指南

## 概述

已為 App 新增「發布許願單」頁面（CreateWishScreen），功能對齊 web 的 `/create`。

## 新增檔案

### 頁面
- `apps/mobile/app/create.tsx` - 主頁面

### 組件
- `apps/mobile/src/components/ImagePickerGrid.tsx` - 圖片選擇器網格
- `apps/mobile/src/components/CountryPickerField.tsx` - 國家選擇器
- `apps/mobile/src/components/CategoryChips.tsx` - 分類選擇器（Chips）

### 工具函數
- `apps/mobile/src/lib/supabaseUpload.ts` - Supabase Storage 圖片上傳工具

## 需要安裝的套件

所有必要的套件已在 `package.json` 中，無需額外安裝：

- ✅ `expo-image-picker` - 圖片選擇（已安裝）
- ✅ `expo-file-system` - 檔案系統操作（已安裝）
- ✅ `base64-arraybuffer` - Base64 解碼（已安裝）

**注意**：未使用 `react-native-country-picker-modal`，已實作簡化版國家選擇器。

## Supabase Storage 設定

### 1. 建立 Bucket

在 Supabase Dashboard → Storage：

1. 點擊「New bucket」
2. 名稱：`wish-images`
3. 設定為 **Public bucket**（允許公開讀取）
4. 點擊「Create bucket」

### 2. 執行 SQL Policy

在 Supabase SQL Editor 執行 `SETUP_CREATE_WISH_STORAGE.sql`：

```sql
-- 允許公開讀取
CREATE POLICY "Wish images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'wish-images');

-- 允許已登入用戶上傳
CREATE POLICY "Users can upload wish images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'wish-images' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
```

### 3. 驗證設定

- 確認 bucket `wish-images` 存在且為 public
- 確認 Storage Policies 已建立（4 條：SELECT, INSERT, UPDATE, DELETE）

## 環境變數

**無需額外設定**，使用現有的 Supabase 配置。

## 功能說明

### 圖片上傳流程

1. 用戶選擇圖片（最多 6 張，每張最大 5MB）
2. 先創建許願單（取得 `wishId`）
3. 上傳圖片到 `wish-images/{userId}/{wishId}/{index}.{ext}`
4. 更新 `wish_requests.images` 欄位

### 表單驗證

- **必填欄位**：商品名稱、購買國家
- **價格驗證**：必須是數字且 >= 0
- **圖片驗證**：格式（JPG/PNG/WEBP）、大小（<= 5MB）

### 路由

頁面路由：`/create`

已在 `app/_layout.tsx` 中註冊：
```typescript
<Stack.Screen name="create" options={{ title: '創建許願單' }} />
```

## 測試方式

1. **啟動 App**：`npm start` 或 `expo start`
2. **導航到創建頁**：從首頁或任何地方導航到 `/create`
3. **填寫表單**：
   - 選擇圖片（最多 6 張）
   - 輸入商品名稱
   - 選擇購買國家
   - （可選）填寫商品連結、分類、價格
4. **提交**：點擊「送出」按鈕
5. **驗證**：
   - 成功後應顯示「已發布許願單」提示
   - 可以選擇「查看許願單」或「返回」
   - 圖片應正確上傳並顯示在許願單詳情頁

## 注意事項

1. **圖片上傳失敗處理**：
   - 如果圖片上傳失敗，許願單仍會創建
   - 會提示用戶稍後可以編輯許願單添加圖片

2. **權限**：
   - 首次選擇圖片需要請求相簿權限
   - 如果權限被拒絕，會提示用戶在系統設定中開啟

3. **圖片路徑**：
   - 格式：`wish-images/{userId}/{wishId}/{index}.{ext}`
   - 如果 `wishId` 不存在（先上傳後創建的情況），使用 `timestamp` 代替

4. **國家選擇器**：
   - 目前使用簡化版（20 個常用國家）
   - 如需完整國家列表，可以擴展 `CountryPickerField` 組件

## 疑難排解

### 圖片上傳失敗（403 Forbidden）

- 檢查 bucket `wish-images` 是否為 public
- 檢查 Storage Policies 是否正確設定
- 確認用戶已登入（`auth.role() = 'authenticated'`）

### 圖片無法顯示

- 檢查 `wish_requests.images` 欄位是否正確更新
- 檢查圖片 URL 是否包含 cache busting query string
- 確認 bucket 為 public 或使用 signed URL

### 表單驗證錯誤

- 檢查必填欄位是否已填寫
- 檢查價格是否為有效數字（>= 0）
- 檢查圖片大小是否超過 5MB


