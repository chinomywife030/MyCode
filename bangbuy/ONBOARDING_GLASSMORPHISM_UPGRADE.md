# 🎨 Onboarding 半透明浮層樣式升級報告

## 📅 完成日期
2025-12-16

---

## 🎯 升級目標

將 Onboarding 提示從「實心背景」升級為「半透明浮層樣式（Glassmorphism）」，提升視覺質感與融入感。

---

## ✅ 已完成的修改

### 修改的檔案

1. **`bangbuy/components/OnboardingTooltip.tsx`** - 核心 Tooltip 組件
2. **`bangbuy/components/ModeToggle.tsx`** - 傳遞 mode 參數
3. **`bangbuy/components/ChatSafetyBanner.tsx`** - 聊天安全橫幅
4. **`bangbuy/app/page.tsx`** - 發布按鈕提示

---

## 📊 視覺效果對比

### 修改前（實心背景）

```css
/* Tooltip */
background: rgb(59, 130, 246);  /* 實心藍色 */
color: white;
border-radius: 8px;
box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);  /* 較重陰影 */
```

**問題**：
- ❌ 視覺過重，像彈窗
- ❌ 不融入背景
- ❌ 無法看到下方內容

---

### 修改後（半透明浮層）

```css
/* Tooltip - 買家模式 */
background: rgba(59, 130, 246, 0.75);  /* 藍色 75% 透明度 */
border: 1px solid rgba(96, 165, 250, 0.3);  /* 淺藍邊框 */
border-radius: 12px;
backdrop-filter: blur(8px);  /* 毛玻璃效果 */
box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);  /* 單層陰影 */

/* Tooltip - 代購模式 */
background: rgba(249, 115, 22, 0.75);  /* 橘色 75% 透明度 */
border: 1px solid rgba(251, 146, 60, 0.3);  /* 淺橘邊框 */
```

**優勢**：
- ✅ 視覺輕盈，不干擾
- ✅ 融入背景
- ✅ 可透視下方內容
- ✅ 現代感強

---

## 🎨 設計規範實作

### 1. 半透明背景

#### 買家模式（藍色）
```tsx
backgroundColor: 'rgba(59, 130, 246, 0.75)'  // 75% 透明度
```

#### 代購模式（橘色）
```tsx
backgroundColor: 'rgba(249, 115, 22, 0.75)'  // 75% 透明度
```

**透明度選擇**：
- 70%～80% 之間
- 既能看清內容，又能透視背景
- 75% 為最佳平衡點

---

### 2. 毛玻璃效果（Backdrop Filter）

```tsx
backdropFilter: 'blur(8px)'
WebkitBackdropFilter: 'blur(8px)'  // Safari 支援
```

**效果**：
- 背景模糊 8px
- 增強層次感
- 提升質感

**瀏覽器支援**：
- ✅ Chrome 76+
- ✅ Safari 9+
- ✅ Firefox 103+
- ✅ Edge 79+

---

### 3. 圓角 12px

```tsx
borderRadius: '12px'
```

**修改前**：8px（較銳利）  
**修改後**：12px（更柔和）

**優勢**：
- 更現代
- 更友善
- 與整體設計一致

---

### 4. 單層陰影

```tsx
boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
```

**修改前**：
```css
box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);  /* 較重 */
```

**修改後**：
```css
box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);  /* 較輕 */
```

**差異**：
- 陰影更淺（0.15 vs 0.2）
- 距離更近（4px vs 10px）
- 範圍更小（12px vs 25px）
- **避免彈窗感**

---

### 5. 淺色邊框

#### 買家模式
```tsx
borderColor: 'rgba(96, 165, 250, 0.3)'  // 淺藍 30% 透明度
```

#### 代購模式
```tsx
borderColor: 'rgba(251, 146, 60, 0.3)'  // 淺橘 30% 透明度
```

**作用**：
- 增強邊界感
- 不過度搶眼
- 與半透明背景協調

---

## 🎯 三個使用場景

### 場景 1：身分切換提示（Tooltip）

**位置**：身分膠囊下方

**樣式**：
```tsx
// 買家模式
background: rgba(59, 130, 246, 0.75)  // 藍色半透明
border: rgba(96, 165, 250, 0.3)
blur: 8px

// 代購模式
background: rgba(249, 115, 22, 0.75)  // 橘色半透明
border: rgba(251, 146, 60, 0.3)
blur: 8px
```

**文案**：
- 買家：「你目前是【買家】，想接單賺錢可切換成【代購】」
- 代購：「你目前是【代購】，想找人幫忙購買可切換成【買家】」

---

### 場景 2：發布按鈕提示（Tooltip）

**位置**：Hero CTA 按鈕上方

**樣式**：同場景 1（依模式切換顏色）

**文案**：
- 買家：「發布需求後，正在旅行的代購會主動聯絡你」
- 代購：「發布行程後，買家可以直接私訊你下單」

---

### 場景 3：聊天安全提示（Banner）

**位置**：聊天頁頂部

**樣式**：
```tsx
// 外層容器（淡背景）
background: rgba(251, 191, 36, 0.15)  // 琥珀色 15% 透明度
border: rgba(251, 191, 36, 0.2)
blur: 8px

// 內層橫幅（較深背景）
background: rgba(251, 191, 36, 0.75)  // 琥珀色 75% 透明度
border: rgba(252, 211, 77, 0.3)
borderRadius: 12px
blur: 8px
```

**文案**：
「為保障雙方權益，請勿私下交易，所有紀錄皆保留於平台」

**設計特色**：
- 雙層結構（外層淡 + 內層深）
- 增強視覺層次
- 保持警告感但不刺眼

---

## 🔧 技術實作細節

### OnboardingTooltip 組件

#### 新增 Props
```tsx
interface OnboardingTooltipProps {
  // ... 原有的
  mode?: 'requester' | 'shopper';  // 新增：模式參數
}
```

#### 顏色切換邏輯
```tsx
const floatingStyles = mode === 'requester'
  ? {
      backgroundColor: 'rgba(59, 130, 246, 0.75)',
      color: 'white',
      borderColor: 'rgba(96, 165, 250, 0.3)',
    }
  : {
      backgroundColor: 'rgba(249, 115, 22, 0.75)',
      color: 'white',
      borderColor: 'rgba(251, 146, 60, 0.3)',
    };
```

#### 應用樣式
```tsx
<div
  style={{
    ...floatingStyles,
    borderRadius: '12px',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
  }}
>
  {/* 內容 */}
</div>
```

---

### 動畫優化

#### 修改前
```css
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

#### 修改後
```css
@keyframes fadeInScale {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-5px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
```

**新增效果**：
- 加入 `scale(0.95)` → `scale(1)`
- 提示從 95% 放大到 100%
- 更流暢的出現動畫

---

## 📱 響應式設計

### 桌面版
```
┌─────────────────────────────┐
│  [身分膠囊] 🛒 買家          │
└──────────┬──────────────────┘
           │
    ┌──────┴──────────────────────┐
    │ 🔵 半透明藍色浮層          [✕] │
    │ 你目前是【買家】，想接單賺   │
    │ 錢可切換成【代購】            │
    └─────────────────────────────┘
    ↑ backdrop-filter: blur(8px)
```

### 手機版
```
┌─────────────────────────────┐
│  [膠囊] 🛒 買家              │
└──────────┬──────────────────┘
           │
    ┌──────┴────────────┐
    │ 🔵 半透明浮層   [✕] │
    │ 你目前是【買家】， │
    │ 想接單賺錢可切換成 │
    │ 【代購】           │
    └───────────────────┘
```

**自動換行**：
- `max-w-xs`（最大寬度）
- 文字自動換行
- 保持可讀性

---

## 🎨 顏色系統

### 買家模式（藍色系）

| 元素 | 顏色 | 透明度 | 用途 |
|-----|------|--------|------|
| 主背景 | `rgb(59, 130, 246)` | 75% | Tooltip 背景 |
| 邊框 | `rgb(96, 165, 250)` | 30% | 邊框 |
| 文字 | `white` | 100% | 內容文字 |

### 代購模式（橘色系）

| 元素 | 顏色 | 透明度 | 用途 |
|-----|------|--------|------|
| 主背景 | `rgb(249, 115, 22)` | 75% | Tooltip 背景 |
| 邊框 | `rgb(251, 146, 60)` | 30% | 邊框 |
| 文字 | `white` | 100% | 內容文字 |

### 聊天安全橫幅（琥珀色系）

| 元素 | 顏色 | 透明度 | 用途 |
|-----|------|--------|------|
| 外層背景 | `rgb(251, 191, 36)` | 15% | 容器背景 |
| 內層背景 | `rgb(251, 191, 36)` | 75% | 橫幅背景 |
| 邊框 | `rgb(252, 211, 77)` | 30% | 邊框 |
| 文字 | `white` | 100% | 內容文字 |

---

## 🔍 視覺層次

### 層次結構（由淺到深）

```
1. 頁面背景（白色/淺灰）
   ↓
2. 半透明浮層（75% 透明度）
   ↓ backdrop-filter: blur(8px)
3. 浮層內容（白色文字）
   ↓
4. 關閉按鈕（80% 透明度）
```

### Z-index 管理

```tsx
Tooltip: z-50
Toast: z-50
Banner: 預設（無需 z-index）
```

---

## 🎯 互動規範

### 1. 點擊外部關閉

```tsx
useEffect(() => {
  const handleClickOutside = (e: MouseEvent) => {
    if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  const timer = setTimeout(() => {
    document.addEventListener('click', handleClickOutside);
  }, 100);

  return () => {
    clearTimeout(timer);
    document.removeEventListener('click', handleClickOutside);
  };
}, [show, onClose]);
```

**延遲 100ms**：避免立即觸發關閉

---

### 2. 關閉按鈕

```tsx
<button
  onClick={(e) => {
    e.stopPropagation();  // 阻止冒泡
    onClose();
  }}
  className="text-white/80 hover:text-white transition-colors"
>
  <svg>...</svg>
</button>
```

**視覺反饋**：
- 預設：80% 透明度
- Hover：100% 透明度
- 過渡：`transition-colors`

---

### 3. 只顯示一次

```tsx
const { shouldShow, hide } = useOnboarding(
  ONBOARDING_KEYS.ROLE_SWITCH
);

// 關閉時自動標記為已顯示
const hide = () => {
  setShouldShow(false);
  markHintAsShown(key);
};
```

**localStorage**：
- `bangbuy_hint_role_switch`
- `bangbuy_hint_post_action`
- `bangbuy_hint_chat_safety`

---

## 🧪 測試指南

### 視覺測試

#### 1. 買家模式
```
1. 刷新首頁（確保是買家模式）
2. 觀察身分切換提示
   ✅ 藍色半透明背景
   ✅ 可透視下方內容
   ✅ 毛玻璃效果（若瀏覽器支援）
   ✅ 圓角 12px
   ✅ 單層陰影
```

#### 2. 代購模式
```
1. 切換到代購模式
2. 清除 localStorage
3. 刷新頁面
4. 觀察提示
   ✅ 橘色半透明背景
   ✅ 其他效果同上
```

#### 3. 聊天安全橫幅
```
1. 清除 localStorage
2. 進入聊天頁
3. 觀察頂部橫幅
   ✅ 琥珀色半透明背景
   ✅ 雙層結構（外淡內深）
   ✅ 圓角 12px
   ✅ 毛玻璃效果
```

---

### 互動測試

#### 點擊外部關閉
```
1. 顯示提示
2. 點擊提示外部任意位置
   ✅ 提示消失
   ✅ localStorage 已標記
```

#### 關閉按鈕
```
1. 顯示提示
2. 點擊右上角 ✕ 按鈕
   ✅ 提示消失
   ✅ localStorage 已標記
```

#### 只顯示一次
```
1. 關閉提示
2. 刷新頁面
   ✅ 提示不再出現
```

---

### 瀏覽器兼容性測試

#### backdrop-filter 支援檢查

| 瀏覽器 | 版本 | 支援 |
|--------|------|------|
| Chrome | 76+ | ✅ |
| Safari | 9+ | ✅ |
| Firefox | 103+ | ✅ |
| Edge | 79+ | ✅ |

**降級處理**：
- 不支援時仍顯示半透明背景
- 只是沒有毛玻璃效果
- 不影響功能

---

## 📊 效果對比總結

### 修改前

| 項目 | 狀態 |
|-----|------|
| 視覺重量 | ❌ 過重 |
| 融入感 | ❌ 差 |
| 現代感 | ⚠️ 普通 |
| 干擾度 | ❌ 高 |
| 質感 | ⚠️ 普通 |

### 修改後

| 項目 | 狀態 |
|-----|------|
| 視覺重量 | ✅ 輕盈 |
| 融入感 | ✅ 優秀 |
| 現代感 | ✅ 強 |
| 干擾度 | ✅ 低 |
| 質感 | ✅ 高 |

---

## 🎉 升級優勢

### 1. 低干擾
- 半透明設計不遮擋內容
- 可透視下方元素
- 視覺輕盈

### 2. 高理解
- 文案清晰
- 顏色依模式切換
- 一眼可辨

### 3. 行動導向
- 明確的關閉按鈕
- 點擊外部即可關閉
- 不阻擋主要操作

### 4. 現代感
- Glassmorphism 設計
- 毛玻璃效果
- 流暢動畫

### 5. 一致性
- 買家/代購顏色統一
- 與整體設計協調
- 視覺語言一致

---

## 🔮 未來優化方向

### 1. 動態模糊強度
```tsx
// 依背景內容調整模糊強度
backdropFilter: `blur(${dynamicBlur}px)`
```

### 2. 漸變背景
```tsx
// 半透明漸變
background: `linear-gradient(
  135deg,
  rgba(59, 130, 246, 0.8),
  rgba(37, 99, 235, 0.7)
)`
```

### 3. 微動畫
```tsx
// 浮動效果
animation: float 3s ease-in-out infinite
```

---

## ✅ 驗收標準

- [x] 半透明背景（opacity 70%～80%）
- [x] backdrop-filter: blur(8px)
- [x] 圓角 12px
- [x] 單層陰影
- [x] 買家模式藍色
- [x] 代購模式橘色
- [x] 不使用 modal 或全畫面遮罩
- [x] 點擊任意處即可關閉
- [x] 僅顯示一次（localStorage）
- [x] 無 linter 錯誤

---

**完成者**：AI Assistant  
**完成日期**：2025-12-16  
**版本**：v2.0 (Glassmorphism Upgrade)





