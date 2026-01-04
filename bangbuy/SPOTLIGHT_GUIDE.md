# 🎯 箭頭式操作引導（Guided Spotlight）

## 📅 完成日期
2025-12-16

---

## 🎯 設計目標

**極簡引導**：讓使用者「因為看見箭頭而自然去點」，而不是因為看了說明才理解。

---

## ✅ 實作內容

### 修改檔案
1. **`bangbuy/components/InteractiveOnboarding.tsx`** - 箭頭式引導

---

## 🎨 視覺設計

### 手機版

```
┌──────────────────┐
│  Navbar          │
│ ┌──────────────┐ │ ← Spotlight 高亮
│ │🛒買家 ✈️代購 │ │
│ └──────────────┘ │
│       ↓          │ ← 箭頭（由上往下）
│  點這裡切換接單模式 │ ← 文案（箭頭下方）
│                  │
│ (其他區域半透明)  │
│                  │
└──────────────────┘
```

### 桌機版

```
┌─────────────────────────────────────┐
│         Navbar                      │
│  ┌──────────────┐ ← Spotlight      │
│  │🛒買家 ✈️代購 │ ←─── 點這裡切換接單模式
│  └──────────────┘     (箭頭 + 文案) │
│                                     │
│  (其他區域半透明)                    │
│                                     │
└─────────────────────────────────────┘
```

---

## 📏 設計規格

### 1. 半透明遮罩

```tsx
backgroundColor: 'rgba(0, 0, 0, 0.7)'  // 70% opacity
// 不使用 backdrop-filter（不模糊）
```

### 2. Spotlight 高亮區域

```tsx
// 位置
top: 12px (手機) / 16px (桌機)
left: 50%
transform: translateX(-50%)

// 尺寸
width: 140px (手機) / 160px (桌機)
height: 36px

// 效果
borderRadius: 20px
boxShadow: 
  0 0 0 9999px rgba(0, 0, 0, 0.7),  // 遮罩
  0 0 20px 4px rgba(255, 255, 255, 0.3)  // 發光

// 動畫
animation: spotlight 2s infinite
```

### 3. 箭頭 SVG

#### 手機版（由上往下）
```tsx
<svg width="40" height="60">
  {/* 箭頭線條 */}
  <line x1="20" y1="0" x2="20" y2="45" />
  
  {/* 箭頭頭部 */}
  <path d="M 20 50 L 12 42 M 20 50 L 28 42" />
  
  {/* 上下移動動畫 */}
  <animate attributeName="y" from="-5" to="5" dur="1.5s" />
</svg>
```

#### 桌機版（由左往右）
```tsx
<svg width="80" height="40">
  {/* 箭頭線條 */}
  <line x1="0" y1="20" x2="65" y2="20" />
  
  {/* 箭頭頭部 */}
  <path d="M 70 20 L 62 12 M 70 20 L 62 28" />
  
  {/* 左右移動動畫 */}
  <animateTransform from="-5 0" to="5 0" dur="1.5s" />
</svg>
```

### 4. 文案

```tsx
// 內容
"點這裡切換接單模式"  // 9 字（不超過 12 字）

// 樣式
color: white
font-weight: semibold
font-size: 15px (手機) / 14px (桌機)
text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5)
letter-spacing: 0.5px
```

---

## 🎬 動畫效果

### 1. 遮罩淡入
```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

### 2. Spotlight 發光脈動
```css
@keyframes spotlight {
  0%, 100% {
    box-shadow: 
      0 0 0 9999px rgba(0, 0, 0, 0.7),
      0 0 20px 4px rgba(255, 255, 255, 0.3);
  }
  50% {
    box-shadow: 
      0 0 0 9999px rgba(0, 0, 0, 0.7),
      0 0 30px 6px rgba(255, 255, 255, 0.5);
  }
}
```

### 3. 箭頭 + 文案滑入
```css
@keyframes fadeInSlide {
  from {
    opacity: 0;
    transform: translateY(-10px);  // 手機
    // 或 translateX(-10px);  // 桌機
  }
  to {
    opacity: 1;
    transform: translateY(0);  // 手機
    // 或 translateX(0);  // 桌機
  }
}
```

---

## 🔧 技術實作

### localStorage 管理

```tsx
const ONBOARDING_KEY = 'bangbuy_spotlight_completed';

// 檢查是否已完成
const completed = localStorage.getItem(ONBOARDING_KEY);

// 標記為已完成（點擊按鈕後自動）
localStorage.setItem(ONBOARDING_KEY, 'true');
```

### 裝置檢測

```tsx
const [isMobile, setIsMobile] = useState(false);

useEffect(() => {
  setIsMobile(window.innerWidth < 768);
}, []);
```

### 自動完成教學

```tsx
useEffect(() => {
  if (!show) return;

  const handleModeToggleClick = () => {
    setShow(false);
    localStorage.setItem(ONBOARDING_KEY, 'true');
  };

  // 監聽身分切換按鈕的點擊
  const modeToggle = document.querySelector('[aria-label*="當前身份"]');
  if (modeToggle) {
    modeToggle.addEventListener('click', handleModeToggleClick);
    return () => {
      modeToggle.removeEventListener('click', handleModeToggleClick);
    };
  }
}, [show]);
```

**關鍵**：
- 使用者點擊按鈕後，自動移除 overlay
- 不需要「我知道了」按鈕
- 自然流暢

---

## 🎯 互動規則

### 1. 只有被指向的按鈕可以互動

```tsx
// Spotlight 區域設為 pointer-events: none
// 讓點擊穿透到下方的實際按鈕
pointerEvents: 'none'
```

### 2. 點擊按鈕後立即完成

```tsx
// 監聽按鈕點擊
modeToggle.addEventListener('click', handleModeToggleClick);

// 立即移除 overlay
setShow(false);

// 標記為已完成
localStorage.setItem(ONBOARDING_KEY, 'true');
```

### 3. 只顯示一次

```tsx
// 首次訪問：顯示
// 完成後：不再顯示
const completed = localStorage.getItem(ONBOARDING_KEY);
if (!completed) {
  setShow(true);
}
```

---

## 🧪 測試指南

### 清除引導記錄

```javascript
localStorage.removeItem('bangbuy_spotlight_completed');
location.reload();
```

### 驗證效果

#### 手機版
```
1. 清除 localStorage
2. 刷新頁面（手機模擬）
   ✅ 半透明遮罩（70% opacity）
   ✅ 身分切換按鈕高亮
   ✅ 箭頭由上往下
   ✅ 文案在箭頭下方
   ✅ 箭頭上下移動動畫
3. 點擊身分切換按鈕
   ✅ 引導立即消失
   ✅ localStorage 已標記
4. 刷新頁面
   ✅ 引導不再顯示
```

#### 桌機版
```
1. 清除 localStorage
2. 刷新頁面（桌機視窗）
   ✅ 半透明遮罩（70% opacity）
   ✅ 身分切換按鈕高亮
   ✅ 箭頭由左往右
   ✅ 文案在箭頭右側
   ✅ 箭頭左右移動動畫
3. 點擊身分切換按鈕
   ✅ 引導立即消失
   ✅ localStorage 已標記
4. 刷新頁面
   ✅ 引導不再顯示
```

---

## 📊 設計優勢

### 1. 極簡直覺
- ✅ 只有箭頭 + 極短文案
- ✅ 不超過 12 字
- ✅ 一眼就懂

### 2. 自然引導
- ✅ 使用者看見箭頭自然去點
- ✅ 不需要閱讀說明
- ✅ 不需要確認按鈕

### 3. 零干擾
- ✅ 不使用 modal
- ✅ 不顯示卡片
- ✅ 點擊按鈕即完成

### 4. 視覺清晰
- ✅ Spotlight 高亮
- ✅ 發光脈動
- ✅ 箭頭動畫

---

## 🚫 禁止事項（已遵守）

- [x] 不使用 modal
- [x] 不顯示「你目前是買家 / 代購」
- [x] 不使用置中卡片
- [x] 不需要「我知道了」按鈕
- [x] 不讓使用者多一步確認

---

## ✅ 驗收標準

- [x] 首次訪問顯示引導
- [x] 半透明遮罩（70% opacity）
- [x] 不模糊畫面
- [x] Spotlight 高亮按鈕
- [x] 只有按鈕可互動
- [x] 箭頭指向按鈕
- [x] 箭頭動畫
- [x] 極短文案（不超過 12 字）
- [x] 手機版：箭頭由上往下
- [x] 桌機版：箭頭由左往右
- [x] 點擊按鈕立即完成
- [x] 不需要確認按鈕
- [x] 只顯示一次
- [x] 無 linter 錯誤

---

## 📁 檔案清單

### 修改檔案
1. `bangbuy/components/InteractiveOnboarding.tsx` - 箭頭式引導
2. `bangbuy/SPOTLIGHT_GUIDE.md` - 本文件

---

**完成者**：AI Assistant  
**完成日期**：2025-12-16  
**版本**：v5.0 (Spotlight Guide)



















