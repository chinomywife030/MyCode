import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '如何把商品運回台灣 | BangBuy 代購平台',
  description: '依你的國家、預算、時效、商品類型選擇最適合的運送方式。了解國際快遞、郵政系統、轉運集運、代購帶回等各種方案。',
};

// ============================================
// 運送方式卡片資料
// ============================================

const SHIPPING_METHODS = [
  {
    id: 'express',
    icon: '✈️',
    title: '國際快遞',
    subtitle: 'DHL / UPS / FedEx / TNT',
    pros: [
      '速度快（通常 3-7 天）',
      '追蹤完整，即時更新',
      '包裝保護較好',
    ],
    cons: [
      '運費較高',
      '報關較嚴謹',
      '部分國家有尺寸/重量限制',
    ],
    bestFor: '高價值商品、急件、需要完整追蹤',
    tip: '建議購買時保留發票，報關時可能需要提供。',
    color: 'blue',
  },
  {
    id: 'postal',
    icon: '📬',
    title: '郵政系統',
    subtitle: '各國郵政 + 中華郵政',
    pros: [
      '運費相對便宜',
      '寄送範圍廣泛',
      '可寄一般物品',
    ],
    cons: [
      '速度較慢且不穩定',
      '追蹤資訊依國家而異',
      '遺失/損壞理賠困難',
    ],
    bestFor: '不急的一般商品、小額商品',
    tip: '選擇掛號或快捷郵件可獲得基本追蹤功能。',
    color: 'green',
  },
  {
    id: 'forwarder',
    icon: '📦',
    title: '轉運 / 集運',
    subtitle: '第三方倉庫服務',
    pros: [
      '可合併多個包裹省運費',
      '部分提供驗貨、拍照服務',
      '適合大量購物',
    ],
    cons: [
      '需要時間集貨',
      '服務品質差異大',
      '需注意禁運品規定',
    ],
    bestFor: '多筆訂單合併寄送、常態性代購',
    tip: '選擇有良好評價的集運商，確認是否支援你的目標國家。',
    color: 'purple',
  },
  {
    id: 'traveler',
    icon: '🧳',
    title: '旅客 / 代購者帶回',
    subtitle: '人肉帶回 / 回台攜帶',
    pros: [
      '彈性高，可當面交付',
      '速度快（依行程）',
      '適合急件或特殊商品',
    ],
    cons: [
      '需要信任機制',
      '受行李空間限制',
      '需與代購者協調時間',
    ],
    bestFor: '急件、當地限定商品、需要驗貨',
    tip: 'BangBuy 平台的核心服務！善用評價系統選擇可靠的代購者。',
    color: 'orange',
  },
  {
    id: 'sea',
    icon: '🚢',
    title: '海運 / 慢速方案',
    subtitle: '貨櫃、海運集運',
    pros: [
      '大件商品運費便宜',
      '適合不急的大型物品',
    ],
    cons: [
      '速度慢（1-2 個月以上）',
      '流程較複雜',
      '需要報關手續',
    ],
    bestFor: '家具、大型電器、大量貨物',
    tip: '通常需要找專業的海運代理處理報關。',
    color: 'slate',
  },
];

// ============================================
// 風險提醒資料
// ============================================

const RISK_WARNINGS = [
  {
    icon: '🚫',
    title: '禁運品注意',
    content: '電池、液體、噴霧、磁性物品、食物（肉類/乳製品）、仿冒品等可能無法寄送，請先確認承運商規定。',
  },
  {
    icon: '💰',
    title: '關稅與報關',
    content: '超過免稅額度（台灣為 2,000 元）可能需要繳納關稅。高價物品請保留購買發票，部分情況需要收件人實名認證。',
  },
  {
    icon: '📋',
    title: '保險與包裝',
    content: '高價值物品建議購買運送保險或加強包裝（如雙層紙箱、氣泡袋）。確認承運商的損壞理賠政策。',
  },
  {
    icon: '📱',
    title: '電子產品',
    content: '電子產品（手機、筆電）需注意保固範圍和規格（電壓、插頭）是否適用台灣。',
  },
];

// ============================================
// 頁面組件
// ============================================

export default function ShippingToTaiwanPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-blue-200 hover:text-white text-sm mb-6 transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            返回首頁
          </Link>
          
          <h1 className="text-3xl sm:text-4xl font-black mb-4 leading-tight">
            如何把商品運回台灣
          </h1>
          <p className="text-lg text-blue-100 leading-relaxed max-w-2xl">
            依你的國家、預算、時效、商品類型（含電池/液體/品牌品）選擇最適合的方式。
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        
        {/* 方案卡片區域 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            📦 常見運送方式
          </h2>
          
          <div className="grid gap-6">
            {SHIPPING_METHODS.map((method) => (
              <div 
                key={method.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                {/* 卡片頂部色條 */}
                <div className={`h-1.5 ${
                  method.color === 'blue' ? 'bg-blue-500' :
                  method.color === 'green' ? 'bg-green-500' :
                  method.color === 'purple' ? 'bg-purple-500' :
                  method.color === 'orange' ? 'bg-orange-500' :
                  'bg-slate-500'
                }`} />
                
                <div className="p-6">
                  {/* 標題區 */}
                  <div className="flex items-start gap-4 mb-4">
                    <span className="text-3xl">{method.icon}</span>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{method.title}</h3>
                      <p className="text-sm text-gray-500">{method.subtitle}</p>
                    </div>
                  </div>

                  {/* 優缺點 */}
                  <div className="grid sm:grid-cols-2 gap-4 mb-4">
                    {/* 優點 */}
                    <div className="bg-green-50 rounded-xl p-4">
                      <p className="text-xs font-bold text-green-700 mb-2">✓ 優點</p>
                      <ul className="space-y-1">
                        {method.pros.map((pro, i) => (
                          <li key={i} className="text-sm text-green-800 flex items-start gap-2">
                            <span className="text-green-500 mt-0.5">•</span>
                            {pro}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    {/* 缺點 */}
                    <div className="bg-red-50 rounded-xl p-4">
                      <p className="text-xs font-bold text-red-700 mb-2">✗ 缺點</p>
                      <ul className="space-y-1">
                        {method.cons.map((con, i) => (
                          <li key={i} className="text-sm text-red-800 flex items-start gap-2">
                            <span className="text-red-500 mt-0.5">•</span>
                            {con}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* 適用情境 */}
                  <div className="bg-gray-50 rounded-xl p-4 mb-3">
                    <p className="text-xs font-bold text-gray-600 mb-1">🎯 最適合</p>
                    <p className="text-sm text-gray-800">{method.bestFor}</p>
                  </div>

                  {/* 小提示 */}
                  <div className="flex items-start gap-2 text-xs text-gray-500">
                    <span>💡</span>
                    <p>{method.tip}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 風險提醒區域 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            ⚠️ 風險提醒
          </h2>
          
          <div className="grid sm:grid-cols-2 gap-4">
            {RISK_WARNINGS.map((warning, index) => (
              <div 
                key={index}
                className="bg-amber-50 border border-amber-100 rounded-xl p-5"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{warning.icon}</span>
                  <div>
                    <h3 className="font-bold text-amber-900 mb-1">{warning.title}</h3>
                    <p className="text-sm text-amber-800 leading-relaxed">{warning.content}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* BangBuy 平台使用建議 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            🛒 在 BangBuy 平台的建議
          </h2>
          
          <div className="grid sm:grid-cols-2 gap-6">
            {/* 給買家的建議 */}
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
              <h3 className="font-bold text-blue-900 mb-4 flex items-center gap-2">
                <span className="text-xl">🛒</span>
                給買家
              </h3>
              <p className="text-sm text-blue-800 mb-3">建議在「需求備註」填寫：</p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-sm text-blue-700">
                  <span className="w-5 h-5 rounded-full bg-blue-200 flex items-center justify-center text-xs font-bold text-blue-800 shrink-0">1</span>
                  希望幾天內收到
                </li>
                <li className="flex items-start gap-2 text-sm text-blue-700">
                  <span className="w-5 h-5 rounded-full bg-blue-200 flex items-center justify-center text-xs font-bold text-blue-800 shrink-0">2</span>
                  是否可接受轉運/集運
                </li>
                <li className="flex items-start gap-2 text-sm text-blue-700">
                  <span className="w-5 h-5 rounded-full bg-blue-200 flex items-center justify-center text-xs font-bold text-blue-800 shrink-0">3</span>
                  商品是否含電池/液體/食物
                </li>
                <li className="flex items-start gap-2 text-sm text-blue-700">
                  <span className="w-5 h-5 rounded-full bg-blue-200 flex items-center justify-center text-xs font-bold text-blue-800 shrink-0">4</span>
                  是否需要保險/發票
                </li>
              </ul>
            </div>

            {/* 給代購者的建議 */}
            <div className="bg-orange-50 border border-orange-100 rounded-2xl p-6">
              <h3 className="font-bold text-orange-900 mb-4 flex items-center gap-2">
                <span className="text-xl">✈️</span>
                給代購者
              </h3>
              <p className="text-sm text-orange-800 mb-3">建議在「報價」時註明：</p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-sm text-orange-700">
                  <span className="w-5 h-5 rounded-full bg-orange-200 flex items-center justify-center text-xs font-bold text-orange-800 shrink-0">1</span>
                  預計的運送方式
                </li>
                <li className="flex items-start gap-2 text-sm text-orange-700">
                  <span className="w-5 h-5 rounded-full bg-orange-200 flex items-center justify-center text-xs font-bold text-orange-800 shrink-0">2</span>
                  是否提供追蹤號碼
                </li>
                <li className="flex items-start gap-2 text-sm text-orange-700">
                  <span className="w-5 h-5 rounded-full bg-orange-200 flex items-center justify-center text-xs font-bold text-orange-800 shrink-0">3</span>
                  預計到貨時間
                </li>
                <li className="flex items-start gap-2 text-sm text-orange-700">
                  <span className="w-5 h-5 rounded-full bg-orange-200 flex items-center justify-center text-xs font-bold text-orange-800 shrink-0">4</span>
                  是否含包材/保險費用
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* CTA 區域 */}
        <section className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 text-center text-white">
          <h2 className="text-2xl font-bold mb-3">開始使用 BangBuy</h2>
          <p className="text-blue-100 mb-6">
            讓留學生和旅客成為你的代購夥伴，輕鬆買到全球好物！
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/create"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-600 font-bold rounded-full shadow-md hover:shadow-lg transition"
            >
              <span>發布需求</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link
              href="/trips/create"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500/30 text-white font-bold rounded-full border border-white/30 hover:bg-blue-500/40 transition"
            >
              <span>發布行程</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white mt-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 text-center">
          <p className="text-xs text-gray-500">
            此頁面提供一般資訊參考，實際運送規定請以各承運商公告為準。
          </p>
          <p className="text-xs text-gray-400 mt-2">
            © {new Date().getFullYear()} BangBuy. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}









