# 🎨 BangBuy 主題色規則指南

## 📋 概述

BangBuy 使用**身份模式驅動**的主題色系統，確保使用者在任何時刻都能一眼識別當前身份模式。

---

## 🎯 核心原則

### 1. **單一主色原則**
- ❌ **禁止**：同一畫面、同一層級同時出現兩個主色的「主 CTA」
- ✅ **允許**：同一張卡片只允許一個主色按鈕
- ✅ **允許**：次要動作使用灰色或 outline 樣式

### 2. **身份模式色彩映射**

| 身份模式 | 主色 | Tailwind Class | RGB | 使用場景 |
|---------|------|---------------|-----|---------|
| **買家 (Buyer/Requester)** | 藍色 | `bg-blue-500` / `text-blue-600` | `rgb(59, 130, 246)` | Hero 背景、主 CTA、Tab active、Logo |
| **代購 (Shopper)** | 橘色 | `bg-orange-500` / `text-orange-600` | `rgb(249, 115, 22)` | Hero 背景、主 CTA、Tab active、Logo |

### 3. **色彩切換動畫**
- 所有主題色切換使用 `transition-all duration-200` 或 `transition-colors duration-200`
- 避免閃爍，提供流暢的視覺體驗

---

## 🧩 組件色彩規範

### A. **Header / Navbar**

#### Logo 文字
```tsx
className={`transition-colors duration-200 ${
  mode === 'shopper' ? 'text-orange-500' : 'text-blue-600'
}`}
```

#### 用戶頭像
```tsx
className={`transition-all duration-200 ${
  mode === 'shopper'
    ? 'border-orange-100 bg-orange-50 text-orange-600'
    : 'border-blue-100 bg-blue-50 text-blue-600'
}`}
```

#### 模式切換按鈕（ModeToggle）
- **設計原則**：明確可點擊的 Tabs，不是狀態指示燈
- **Active 狀態**：
  - 買家：`bg-blue-500 text-white shadow-inner`
  - 代購：`bg-orange-500 text-white shadow-inner`
- **Inactive 狀態**：`bg-white text-gray-700 hover:bg-blue-50`（買家）/ `hover:bg-orange-50`（代購）
- **尺寸**：
  - Compact（Navbar）：`minHeight: 44px, minWidth: 85px`
  - Full（其他）：`minHeight: 48px, minWidth: 110px`
- **Icon**：🛒 買家 / ✈️ 代購

---

### B. **Hero 區塊**

#### 背景漸層
```tsx
style={{
  background: mode === 'requester' 
    ? 'linear-gradient(to right, rgb(59, 130, 246), rgb(37, 99, 235))' 
    : 'linear-gradient(to right, rgb(249, 115, 22), rgb(234, 88, 12))'
}}
```

#### 主按鈕
```tsx
className={`transition-all duration-200 ${
  mode === 'requester' 
    ? 'bg-white text-blue-600 hover:bg-blue-50' 
    : 'bg-white text-orange-600 hover:bg-orange-50'
}`}
```

#### 文案
| 模式 | 標題 | 副標 | CTA |
|-----|------|------|-----|
| 買家 | 找到可靠的代購 | 發布需求，輕鬆購買全球商品 | 發布需求 |
| 代購 | 開始接單賺錢 | 利用你的行程，幫他人代購賺收入 | 發布行程 |

---

### C. **列表卡片**

#### 買家模式（看行程列表）
- **主 CTA**：藍色按鈕
  ```tsx
  className="bg-blue-500 text-white hover:bg-blue-600 transition-all duration-200"
  ```
- **次要動作**：灰色 outline 或 icon

#### 代購模式（看需求列表）
- **主 CTA**：橘色按鈕
  ```tsx
  className="bg-orange-500 text-white hover:bg-orange-600 transition-all duration-200"
  ```
- **次要動作**：灰色 outline 或 icon

#### 收藏按鈕
- **固定紅色**（不受身份模式影響）
  ```tsx
  className="bg-red-500 text-white"
  ```

---

### D. **底部導航 (BottomNav)**

#### Active 色彩（跟隨身份模式）
```tsx
// 買家模式：藍色 / 代購模式：橘色
const activeColor = mode === 'requester' ? 'text-blue-500' : 'text-orange-500';
const activeBgColor = mode === 'requester' ? 'bg-blue-500' : 'bg-orange-500';
```

#### 通知 Badge
- **固定紅色**（不受身份模式影響）
  ```tsx
  className="bg-red-500 text-white"
  ```

---

## 🚀 實作檢查清單

在實作新功能或修改 UI 時，請確認：

- [ ] 同一畫面只有一個主色的主 CTA
- [ ] 主題色切換有 `transition-all duration-200`
- [ ] Active 狀態跟隨 `mode` 變數
- [ ] 次要動作使用灰色或 outline
- [ ] 通知/警告類 badge 使用固定紅色
- [ ] 手機版點擊區域 ≥ 44px
- [ ] 按鈕有 `cursor: pointer` 和 `aria-pressed`/`aria-label`

---

## 📝 相關檔案

| 檔案 | 用途 |
|-----|------|
| `components/UserModeProvider.tsx` | 全域身份模式狀態管理 |
| `components/ModeToggle.tsx` | 模式切換按鈕組件 |
| `lib/dictionary.ts` | 多語言文案（含模式相關） |
| `app/page.tsx` | 首頁 Hero 與列表卡片 |
| `components/Navbar.tsx` | 頂部導航 |
| `components/BottomNav.tsx` | 底部導航 |

---

## 🎨 設計 Token

如未來需要調整色彩，請修改以下數值：

```typescript
// 主題色
const THEME_COLORS = {
  buyer: {  // 買家（requester）
    primary: 'rgb(59, 130, 246)',   // blue-500
    primaryDark: 'rgb(37, 99, 235)', // blue-600
    primaryLight: 'rgb(147, 197, 253)', // blue-300
  },
  shopper: {  // 代購
    primary: 'rgb(249, 115, 22)',   // orange-500
    primaryDark: 'rgb(234, 88, 12)', // orange-600
    primaryLight: 'rgb(253, 186, 116)', // orange-300
  },
  neutral: {
    gray: 'rgb(107, 114, 128)',     // gray-500
    red: 'rgb(239, 68, 68)',        // red-500 (通知/警告)
  }
};

// 動畫時長
const TRANSITION_DURATION = '200ms'; // 0.2s
```

---

## ✅ 驗收標準

1. **視覺一致性**：切換身份模式後，Header/Hero/卡片 CTA/Tab 正確變色且不混色
2. **動畫流暢**：色彩切換有 0.2s transition，無閃爍
3. **手機友好**：切換按鈕 ≥ 44px，單手可輕鬆點擊
4. **無障礙**：所有按鈕有 `cursor: pointer` 和適當的 `aria-*` 屬性
5. **語意清晰**：使用「買家」和「代購」，禁用「需求者」
6. **切換明確**：切換按鈕像 Tabs，不是狀態指示燈

---

**最後更新**：2025-12-16  
**維護者**：BangBuy 開發團隊

