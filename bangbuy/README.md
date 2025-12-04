# BangBuy - 全球代購平台

這是一個基於 [Next.js](https://nextjs.org) 的代購平台，連結全球留學生與買家。

## 環境設定

### 1. 安裝依賴

```bash
npm install
```

### 2. 配置 Supabase

本專案使用 Supabase 作為後端資料庫。請按照以下步驟設定：

1. 到 [Supabase](https://supabase.com) 創建一個新專案
2. 複製 `.env.example` 為 `.env.local`：
   ```bash
   cp .env.example .env.local
   ```
3. 在 Supabase 專案設定中找到 API 憑證
4. 將 URL 和 anon key 填入 `.env.local` 檔案

### 3. 啟動開發伺服器

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## 資料庫結構

在 Supabase 中需要創建以下資料表：

- `profiles` - 用戶資料
- `wish_requests` - 許願單
- `trips` - 代購行程
- `orders` - 訂單
- `reviews` - 評價
- `favorites` - 收藏

詳細的資料表結構請參考專案中的資料庫 schema。

## 功能特色

- 🛍️ **買家模式**：發布許願單，尋找代購
- ✈️ **代購模式**：接單幫帶，賺取旅費
- 💬 **即時聊天**：買家與代購直接溝通
- ⭐ **評價系統**：透明的信用評分
- 🔒 **安全交易**：保障雙方權益

## 技術棧

- **框架**: Next.js 16 (App Router)
- **語言**: TypeScript
- **樣式**: Tailwind CSS
- **後端**: Supabase (PostgreSQL + Auth)
- **部署**: Vercel

## 開發指令

```bash
npm run dev      # 啟動開發伺服器
npm run build    # 建構生產版本
npm run start    # 啟動生產伺服器
npm run lint     # 執行 ESLint 檢查
```

## 故障排除

### 許願單無法顯示

如果主頁的許願單無法載入，請檢查：

1. ✅ `.env.local` 檔案是否存在且包含正確的 Supabase 憑證
2. ✅ Supabase 專案是否已創建必要的資料表
3. ✅ 打開瀏覽器開發者工具查看控制台錯誤訊息

## 了解更多

- [Next.js 文檔](https://nextjs.org/docs)
- [Supabase 文檔](https://supabase.com/docs)
- [Tailwind CSS 文檔](https://tailwindcss.com/docs)
