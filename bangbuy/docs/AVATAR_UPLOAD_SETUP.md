# 頭像上傳功能設定指南

## 概述

在 `/profile` 頁面新增了「更換頭像」功能，使用者可以上傳、預覽並更新個人頭像。

## 功能特點

- ✅ 點擊頭像或「更換照片」按鈕選擇圖片
- ✅ 即時預覽（圓形顯示）
- ✅ 檔案驗證（PNG/JPG/WEBP，最大 5MB）
- ✅ 自動壓縮到 512x512（保持比例）
- ✅ 上傳到 Supabase Storage (`avatars` bucket)
- ✅ 自動更新 Navbar 和其他地方的頭像顯示
- ✅ 完整的錯誤處理和 loading 狀態

## 設定步驟

### 1. 執行資料庫 Migration

在 Supabase SQL Editor 執行 `migration-avatar-upload.sql`：

```sql
-- 確保 profiles 表有 avatar_url 和 avatar_updated_at 欄位
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS avatar_updated_at TIMESTAMPTZ;
```

### 2. 建立 Storage Bucket

在 Supabase Dashboard → Storage：

1. 點擊「New bucket」
2. 名稱：`avatars`
3. 設定為 **Public bucket**（允許公開讀取）
4. 點擊「Create bucket」

### 3. 設定 Storage Policies

在 Supabase Dashboard → Storage → Policies → `avatars`：

#### Policy 1: 公開讀取
- **Policy name**: `Avatar images are publicly accessible`
- **Allowed operation**: SELECT
- **Policy definition**:
```sql
bucket_id = 'avatars'
```

#### Policy 2: 用戶上傳自己的頭像
- **Policy name**: `Users can upload their own avatars`
- **Allowed operation**: INSERT
- **Policy definition**:
```sql
bucket_id = 'avatars' AND
auth.uid()::text = (storage.foldername(name))[1]
```

#### Policy 3: 用戶更新自己的頭像
- **Policy name**: `Users can update their own avatars`
- **Allowed operation**: UPDATE
- **Policy definition**:
```sql
bucket_id = 'avatars' AND
auth.uid()::text = (storage.foldername(name))[1]
```

#### Policy 4: 用戶刪除自己的頭像
- **Policy name**: `Users can delete their own avatars`
- **Allowed operation**: DELETE
- **Policy definition**:
```sql
bucket_id = 'avatars' AND
auth.uid()::text = (storage.foldername(name))[1]
```

### 4. 驗證設定

1. 前往 `/profile` 頁面
2. 點擊「更換照片」或頭像
3. 選擇一張圖片（PNG/JPG/WEBP，< 5MB）
4. 確認預覽顯示
5. 點擊「儲存」
6. 確認上傳成功且 Navbar 頭像更新

## 檔案結構

```
bangbuy/
├── app/
│   └── profile/
│       └── page.tsx          # 新增頭像上傳 UI
├── lib/
│   └── avatarUpload.ts       # 頭像上傳工具函數
├── components/
│   └── Navbar.tsx            # 更新：監聽頭像更新事件
└── migration-avatar-upload.sql  # 資料庫 migration
```

## API 說明

### `validateImageFile(file: File)`
驗證圖片檔案格式和大小。

### `compressImage(file: File): Promise<File>`
將圖片壓縮到最大 512x512（保持比例）。

### `uploadAvatar(userId: string, file: File)`
上傳頭像到 Supabase Storage，返回 public URL。

### `updateProfileAvatar(userId: string, avatarUrl: string)`
更新 profiles 表的 avatar_url。

## 儲存路徑

頭像儲存路徑格式：
```
avatars/{userId}/{timestamp}.{ext}
```

例如：
```
avatars/123e4567-e89b-12d3-a456-426614174000/1704067200000.jpg
```

## 自動刷新機制

上傳成功後會：
1. 觸發 `avatar-updated` 自訂事件
2. Navbar 監聽事件並重新載入頭像
3. 500ms 後刷新整個頁面（確保所有地方都更新）

## 錯誤處理

- 檔案格式錯誤：顯示「只接受 PNG、JPG、WEBP 格式的圖片」
- 檔案過大：顯示「圖片大小不能超過 5MB」
- 上傳失敗：顯示具體錯誤訊息
- 更新失敗：顯示「更新失敗」並保留預覽

## 注意事項

1. **Storage Bucket 必須是 Public**：否則無法取得 public URL
2. **檔案路徑包含 userId**：確保用戶只能上傳到自己的資料夾
3. **每次上傳都創建新檔案**：不覆蓋舊檔案（可選：之後可以實作清理舊檔案）
4. **壓縮功能可選**：如果 canvas 不可用，會使用原檔案











