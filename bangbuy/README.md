This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

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

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## 測試推播通知 API

### API Endpoint

**POST** `/api/push/test`

發送測試推播通知到指定用戶的裝置。

#### Request Body

```json
{
  "userId": "user-uuid-here",
  "title": "測試推播",
  "body": "這是一則測試推播通知"
}
```

#### 參數說明

- `userId` (string, 可選): 目標用戶 ID。如果留空或設為 `"latest"`，會使用最新一筆 token（用於快速測試）
- `title` (string, 必填): 推播標題
- `body` (string, 必填): 推播內容

#### Response

```json
{
  "success": true,
  "sent": 1,
  "errors": 0,
  "tokensFound": 1,
  "tokensUsed": 1,
  "details": {
    "results": [...],
    "errors": []
  }
}
```

#### 使用 curl 測試

```bash
curl -X POST http://localhost:3000/api/push/test \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "your-user-id-here",
    "title": "測試推播",
    "body": "這是一則測試推播通知"
  }'
```

#### 使用測試頁面

訪問 `/test-push` 頁面，提供簡單的 UI 介面來測試推播功能。

#### 注意事項

- 無效的 token（DeviceNotRegistered、Invalid 等）會自動從資料庫中刪除
- 如果用戶有多個裝置，會同時發送到所有裝置
- 需要確保 `SUPABASE_SERVICE_ROLE_KEY` 環境變數已設置
