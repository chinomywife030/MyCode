# 🎓 新手歡迎教學實作指南

## 📅 完成日期
2025-12-16

---

## 🎯 設計目標

為首次訪問 BangBuy 的使用者提供**簡單、清晰的歡迎教學流程**，幫助他們快速理解平台核心功能。

---

## ✅ 實作內容

### 新增檔案

1. **`bangbuy/components/WelcomeOnboarding.tsx`** - 新手歡迎教學組件

### 修改檔案

1. **`bangbuy/app/page.tsx`** - 整合歡迎教學
2. **`bangbuy/components/ModeToggle.tsx`** - 移除分散式提示
3. **`bangbuy/app/chat/page.tsx`** - 移除安全橫幅

---

## 🎨 視覺設計

### 半透明浮層樣式（Glassmorphism）

```tsx
// 背景遮罩
backgroundColor: 'rgba(0, 0, 0, 0.4)'
backdropFilter: 'blur(4px)'

// 教學卡片（買家模式）
backgroundColor: 'rgba(59, 130, 246, 0.75)'  // 藍色 75%
borderColor: 'rgba(96, 165, 250, 0.3)'
borderRadius: '16px'
backdropFilter: 'blur(12px)'
boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'

// 教學卡片（代購模式）
backgroundColor: 'rgba(249, 115, 22, 0.75)'  // 橘色 75%
borderColor: 'rgba(251, 146, 60, 0.3)'
```

**特色**：
- ✅ 半透明背景（75% 透明度）
- ✅ 毛玻璃效果（blur 12px）
- ✅ 大圓角（16px）
- ✅ 柔和陰影
- ✅ 依模式切換顏色（藍/橘）

---

## 📖 教學流程

### 買家模式（4 步驟）

#### 步驟 1：歡迎
```
👋 歡迎來到 BangBuy！
BangBuy 是一個跨境代購平台，讓你輕鬆購買全球商品
```

#### 步驟 2：身分說明
```
🛒 你目前是【買家】
你可以發布需求，讓正在旅行的代購幫你購買商品
```

#### 步驟 3：如何開始
```
✨ 如何開始？
點擊「發布需求」按鈕，填寫你想買的商品和預算，代購會主動聯絡你
```

#### 步驟 4：切換身分
```
✈️ 想賺外快？
點擊右上角切換成【代購】，發布你的行程，幫他人代購賺收入
```

---

### 代購模式（4 步驟）

#### 步驟 1：歡迎
```
👋 歡迎來到 BangBuy！
BangBuy 是一個跨境代購平台，讓你利用旅行賺取收入
```

#### 步驟 2：身分說明
```
✈️ 你目前是【代購】
你可以發布行程，幫買家購買商品並賺取收入
```

#### 步驟 3：如何開始
```
✨ 如何開始？
點擊「發布行程」按鈕，填寫你的旅行計畫，買家會私訊你下單
```

#### 步驟 4：切換身分
```
🛒 想購買商品？
點擊右上角切換成【買家】，發布需求，找人幫你代購
```

---

## 🎯 互動設計

### 1. 進度指示器

```tsx
// 當前步驟：長條（32px）
width: '32px'
backgroundColor: 'white'

// 其他步驟：圓點（8px）
width: '8px'
backgroundColor: 'rgba(255, 255, 255, 0.3)'
```

**視覺效果**：
```
步驟 1：━━━━ ○ ○ ○
步驟 2：○ ━━━━ ○ ○
步驟 3：○ ○ ━━━━ ○
步驟 4：○ ○ ○ ━━━━
```

---

### 2. 按鈕設計

#### 上一步 / 跳過（左側）
```tsx
backgroundColor: 'rgba(255, 255, 255, 0.2)'  // 半透明白
color: 'white'
border: '1px solid rgba(255, 255, 255, 0.3)'
```

**文字**：
- 步驟 1：「跳過」
- 步驟 2-4：「上一步」

#### 下一步 / 開始使用（右側）
```tsx
backgroundColor: 'white'  // 實心白
color: mode === 'requester' ? '#2563eb' : '#ea580c'  // 藍/橘
boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
hover: scale(1.05)
```

**文字**：
- 步驟 1-3：「下一步」
- 步驟 4：「開始使用」

---

### 3. 關閉方式

#### 方式 1：點擊背景遮罩
```tsx
onClick={handleSkip}  // 背景遮罩
onClick={(e) => e.stopPropagation()}  // 卡片本身
```

#### 方式 2：點擊關閉按鈕
```tsx
// 右上角 ✕ 按鈕
position: absolute
top: 4px
right: 4px
```

#### 方式 3：點擊「跳過」按鈕
```tsx
// 步驟 1 的左側按鈕
```

---

## 🔧 技術實作

### localStorage 管理

```tsx
// Key
const ONBOARDING_KEY = 'bangbuy_welcome_completed';

// 檢查是否已完成
const completed = localStorage.getItem(ONBOARDING_KEY);

// 標記為已完成
localStorage.setItem(ONBOARDING_KEY, 'true');
```

---

### 顯示邏輯

```tsx
useEffect(() => {
  const completed = localStorage.getItem(ONBOARDING_KEY);
  if (!completed) {
    // 延遲 500ms 顯示，避免閃爍
    const timer = setTimeout(() => {
      setShow(true);
    }, 500);
    return () => clearTimeout(timer);
  }
}, []);
```

**延遲原因**：
- 避免頁面載入時閃爍
- 讓頁面先渲染完成
- 提升使用者體驗

---

### 步驟切換

```tsx
// 下一步
const handleNext = () => {
  if (currentStep < steps.length - 1) {
    setCurrentStep(currentStep + 1);
  } else {
    handleClose();  // 最後一步 -> 關閉
  }
};

// 上一步
const handlePrev = () => {
  if (currentStep > 0) {
    setCurrentStep(currentStep - 1);
  }
};
```

---

### 動畫效果

#### 背景遮罩淡入
```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

#### 卡片縮放進入
```css
@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
```

---

## 📱 響應式設計

### 桌面版
```
┌────────────────────────────────────┐
│                                    │
│         ┌──────────────┐          │
│         │              │          │
│         │   👋 (60px)  │          │
│         │              │          │
│         │  歡迎來到     │          │
│         │  BangBuy！   │          │
│         │              │          │
│         │  說明文字...  │          │
│         │              │          │
│         │  ━━━━ ○ ○ ○  │          │
│         │              │          │
│         │ [跳過][下一步] │          │
│         └──────────────┘          │
│                                    │
└────────────────────────────────────┘
```

### 手機版
```
┌──────────────────┐
│                  │
│  ┌────────────┐ │
│  │            │ │
│  │  👋 (48px) │ │
│  │            │ │
│  │ 歡迎來到    │ │
│  │ BangBuy！  │ │
│  │            │ │
│  │ 說明文字... │ │
│  │            │ │
│  │ ━━━━ ○ ○ ○ │ │
│  │            │ │
│  │[跳過][下一步]│ │
│  └────────────┘ │
│                  │
└──────────────────┘
```

**自動調整**：
- `max-w-md`（最大寬度 448px）
- `p-4`（手機留白）
- Icon 大小自適應

---

## 🎨 顏色系統

### 買家模式（藍色系）

| 元素 | 顏色 | 透明度 |
|-----|------|--------|
| 卡片背景 | `rgb(59, 130, 246)` | 75% |
| 卡片邊框 | `rgb(96, 165, 250)` | 30% |
| 文字 | `white` | 100% |
| 主按鈕文字 | `#2563eb` | 100% |

### 代購模式（橘色系）

| 元素 | 顏色 | 透明度 |
|-----|------|--------|
| 卡片背景 | `rgb(249, 115, 22)` | 75% |
| 卡片邊框 | `rgb(251, 146, 60)` | 30% |
| 文字 | `white` | 100% |
| 主按鈕文字 | `#ea580c` | 100% |

### 通用

| 元素 | 顏色 | 透明度 |
|-----|------|--------|
| 背景遮罩 | `rgb(0, 0, 0)` | 40% |
| 主按鈕背景 | `white` | 100% |
| 次按鈕背景 | `white` | 20% |
| 次按鈕邊框 | `white` | 30% |

---

## 🧪 測試指南

### 測試新手教學

#### 1. 清除 localStorage
```javascript
localStorage.removeItem('bangbuy_welcome_completed');
location.reload();
```

#### 2. 驗證顯示
```
✅ 延遲 500ms 後顯示
✅ 背景半透明遮罩
✅ 卡片半透明浮層
✅ 毛玻璃效果（若瀏覽器支援）
✅ 顏色依模式切換（藍/橘）
```

#### 3. 測試步驟切換
```
1. 點擊「下一步」
   ✅ 切換到步驟 2
   ✅ 進度指示器更新
   
2. 點擊「上一步」
   ✅ 回到步驟 1
   ✅ 進度指示器更新
   
3. 連續點擊「下一步」到步驟 4
   ✅ 按鈕文字變成「開始使用」
   
4. 點擊「開始使用」
   ✅ 教學關閉
   ✅ localStorage 已標記
```

#### 4. 測試關閉方式
```
方式 1：點擊背景遮罩
  ✅ 教學關閉
  ✅ localStorage 已標記

方式 2：點擊右上角 ✕
  ✅ 教學關閉
  ✅ localStorage 已標記

方式 3：點擊「跳過」
  ✅ 教學關閉
  ✅ localStorage 已標記
```

#### 5. 測試持久化
```
1. 完成教學
2. 刷新頁面
   ✅ 教學不再顯示
3. 關閉瀏覽器再開啟
   ✅ 教學仍不顯示
```

---

### 測試模式切換

#### 1. 買家模式
```
1. 確保當前是買家模式
2. 清除 localStorage
3. 刷新頁面
   ✅ 顯示買家版教學
   ✅ 藍色半透明卡片
   ✅ 步驟 2：「你目前是【買家】」
   ✅ 步驟 4：「想賺外快？」
```

#### 2. 代購模式
```
1. 切換到代購模式
2. 清除 localStorage
3. 刷新頁面
   ✅ 顯示代購版教學
   ✅ 橘色半透明卡片
   ✅ 步驟 2：「你目前是【代購】」
   ✅ 步驟 4：「想購買商品？」
```

---

## 📊 使用者體驗流程

### 首次訪問（買家模式）

```
1. 使用者打開 BangBuy
   ↓
2. 頁面載入完成
   ↓
3. 延遲 500ms
   ↓
4. 顯示歡迎教學（藍色半透明卡片）
   ↓
5. 步驟 1：歡迎來到 BangBuy
   「這是什麼平台？」
   ↓
6. 點擊「下一步」
   ↓
7. 步驟 2：你目前是【買家】
   「我的身分是什麼？」
   ↓
8. 點擊「下一步」
   ↓
9. 步驟 3：如何開始？
   「我要怎麼使用？」
   ↓
10. 點擊「下一步」
   ↓
11. 步驟 4：想賺外快？
   「我還能做什麼？」
   ↓
12. 點擊「開始使用」
   ↓
13. 教學關閉，開始使用平台
```

---

## 🎯 設計優勢

### 1. 簡單清晰
- ✅ 只有 4 個步驟
- ✅ 每步驟一個重點
- ✅ 文案簡短易懂
- ✅ Icon 視覺化

### 2. 低干擾
- ✅ 半透明設計
- ✅ 可隨時跳過
- ✅ 不阻擋操作
- ✅ 只顯示一次

### 3. 高理解
- ✅ 依模式切換內容
- ✅ 顏色語意一致
- ✅ 進度清晰可見
- ✅ 行動導向明確

### 4. 現代感
- ✅ Glassmorphism 設計
- ✅ 流暢動畫
- ✅ 響應式設計
- ✅ 無障礙支援

---

## 🔮 未來優化方向

### 1. 互動式教學
```tsx
// 高亮實際元素
<Spotlight target="#create-button" />

// 引導點擊
<GuideArrow target="#mode-toggle" />
```

### 2. 個人化內容
```tsx
// 依使用者來源調整
if (referrer === 'travel-blog') {
  // 強調代購賺錢
} else {
  // 強調購買商品
}
```

### 3. 進階教學
```tsx
// 完成基礎教學後
<AdvancedTips />

// 例如：如何提高成交率、如何評價等
```

### 4. 成就系統
```tsx
// 完成教學獲得徽章
<Achievement name="新手上路" />
```

---

## 📝 重要提醒

### 1. localStorage 容錯
```tsx
try {
  localStorage.setItem(ONBOARDING_KEY, 'true');
} catch {
  // localStorage 不可用時忽略
  // 不影響核心功能
}
```

### 2. 延遲顯示
```tsx
// 延遲 500ms 避免閃爍
setTimeout(() => {
  setShow(true);
}, 500);
```

### 3. 事件冒泡
```tsx
// 卡片本身不觸發關閉
onClick={(e) => e.stopPropagation()}
```

### 4. 清理定時器
```tsx
useEffect(() => {
  const timer = setTimeout(...);
  return () => clearTimeout(timer);  // 清理
}, []);
```

---

## ✅ 驗收標準

- [x] 首次訪問顯示教學
- [x] 完成後不再顯示
- [x] 依模式切換內容和顏色
- [x] 半透明浮層樣式
- [x] 毛玻璃效果
- [x] 4 個步驟流程
- [x] 進度指示器
- [x] 可隨時跳過
- [x] 點擊背景關閉
- [x] 響應式設計
- [x] 流暢動畫
- [x] 無 linter 錯誤

---

## 📁 檔案清單

### 新增檔案
1. `bangbuy/components/WelcomeOnboarding.tsx` - 新手歡迎教學
2. `bangbuy/WELCOME_ONBOARDING_GUIDE.md` - 本文件

### 修改檔案
1. `bangbuy/app/page.tsx` - 整合教學
2. `bangbuy/components/ModeToggle.tsx` - 移除分散式提示
3. `bangbuy/app/chat/page.tsx` - 移除安全橫幅

---

**完成者**：AI Assistant  
**完成日期**：2025-12-16  
**版本**：v3.0 (Welcome Onboarding)


