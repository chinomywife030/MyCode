export const metadata = {
  title: 'Cookie 政策 - BangBuy',
  description: 'BangBuy Cookie 使用說明與管理選項',
};

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm p-8 md:p-12">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Cookie 政策</h1>
          <p className="text-sm text-gray-500">Cookie Policy</p>
          <p className="text-sm text-gray-600 mt-2">Last updated: 2025-12-13</p>
        </div>

        <div className="prose prose-gray max-w-none space-y-6 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">1. 什麼是 Cookie？</h2>
            <p>Cookie 是網站儲存在您的裝置（電腦、手機或平板）上的小型文字檔案。Cookie 幫助網站記住您的偏好、識別您的裝置，並改善使用體驗。</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">2. 我們使用的 Cookie 類型</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mt-4 mb-2">2.1 必要 Cookie（Strictly Necessary）</h3>
            <p>這些 Cookie 是網站正常運作所必需的，無法關閉：</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>驗證 Cookie</strong>：維持您的登入狀態</li>
              <li><strong>安全 Cookie</strong>：防止 CSRF 攻擊，保護帳號安全</li>
              <li><strong>負載平衡 Cookie</strong>：確保網站穩定運作</li>
            </ul>
            <p className="mt-2 text-sm">有效期限：Session（關閉瀏覽器後刪除）或最長 12 個月</p>

            <h3 className="text-xl font-semibold text-gray-800 mt-4 mb-2">2.2 功能性 Cookie（Functional）</h3>
            <p>這些 Cookie 用於記住您的偏好與設定：</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>語言偏好</strong>：記住您選擇的語言</li>
              <li><strong>模式偏好</strong>：買家模式或代購模式</li>
              <li><strong>Cookie 同意</strong>：記住您的 Cookie 偏好選擇</li>
            </ul>
            <p className="mt-2 text-sm">有效期限：6-12 個月</p>

            <h3 className="text-xl font-semibold text-gray-800 mt-4 mb-2">2.3 分析 Cookie（Analytics）</h3>
            <p>這些 Cookie 幫助我們了解網站使用情況：</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Google Analytics</strong>：分析訪客行為、頁面瀏覽、停留時間</li>
              <li><strong>使用數據</strong>：了解哪些功能最受歡迎</li>
              <li><strong>錯誤追蹤</strong>：發現並修復問題</li>
            </ul>
            <p className="mt-2 text-sm">有效期限：最長 24 個月</p>
            <p className="mt-2 text-sm italic">您可以選擇拒絕分析 Cookie，不影響網站功能。</p>

            <h3 className="text-xl font-semibold text-gray-800 mt-4 mb-2">2.4 廣告 Cookie（Advertising/Marketing）</h3>
            <p>這些 Cookie 用於提供相關廣告（如使用 Google AdSense）：</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Google AdSense</strong>：顯示個人化廣告</li>
              <li><strong>再行銷</strong>：向曾訪問的用戶顯示廣告</li>
              <li><strong>廣告效益追蹤</strong>：衡量廣告效果</li>
            </ul>
            <p className="mt-2 text-sm">有效期限：最長 24 個月</p>
            <p className="mt-2 text-sm italic">您可以選擇拒絕廣告 Cookie，但可能仍會看到廣告（只是不會個人化）。</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">3. 第三方 Cookie</h2>
            <p>我們使用的第三方服務可能設置自己的 Cookie：</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Google Analytics</strong>：網站分析（詳見 <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google 隱私權政策</a>）</li>
              <li><strong>Google AdSense</strong>：廣告服務（詳見 <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google 廣告政策</a>）</li>
              <li><strong>Supabase</strong>：後端服務（詳見 <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Supabase 隱私權政策</a>）</li>
            </ul>
            <p className="mt-3">這些第三方服務有各自的隱私權政策與 Cookie 政策，不受本政策約束。</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">4. 如何管理 Cookie？</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mt-4 mb-2">4.1 透過我們的 Cookie Banner</h3>
            <p>首次訪問時，您可以選擇接受或拒絕非必要 Cookie。您可以隨時透過頁面底部的「Cookie 設定」更改選擇。</p>

            <h3 className="text-xl font-semibold text-gray-800 mt-4 mb-2">4.2 透過瀏覽器設定</h3>
            <p>大多數瀏覽器允許您控制 Cookie：</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Chrome</strong>：設定 → 隱私權和安全性 → Cookie 和其他網站資料</li>
              <li><strong>Firefox</strong>：選項 → 隱私權與安全性 → Cookie 與網站資料</li>
              <li><strong>Safari</strong>：偏好設定 → 隱私權 → Cookie 與網站資料</li>
              <li><strong>Edge</strong>：設定 → Cookie 和網站權限 → Cookie 和儲存的資料</li>
            </ul>
            <p className="mt-3 text-sm italic">注意：完全禁用 Cookie 可能導致網站部分功能無法使用（如無法登入）。</p>

            <h3 className="text-xl font-semibold text-gray-800 mt-4 mb-2">4.3 退出第三方追蹤</h3>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Google Analytics</strong>：安裝 <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google Analytics 停用附加元件</a></li>
              <li><strong>Google 廣告</strong>：前往 <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google 廣告設定</a></li>
              <li><strong>Do Not Track</strong>：啟用瀏覽器的「請勿追蹤」功能</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">5. 行動裝置</h2>
            <p>行動裝置也可能使用類似技術（如廣告識別碼）：</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>iOS</strong>：設定 → 隱私權 → 追蹤 → 關閉「允許 App 要求追蹤」</li>
              <li><strong>Android</strong>：設定 → Google → 廣告 → 選擇退出廣告個人化</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">6. Cookie 與隱私權</h2>
            <p>我們使用 Cookie 蒐集的資料依照《隱私權政策》處理。Cookie 資料可能包含：</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>唯一識別碼</li>
              <li>瀏覽行為資訊</li>
              <li>裝置與瀏覽器資訊</li>
              <li>IP 位址（可能被匿名化）</li>
            </ul>
            <p className="mt-3">詳細資訊請參閱《隱私權政策》。</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">7. Cookie 政策更新</h2>
            <p>我們可能不定期更新本政策以反映技術變化或法律要求。更新後的政策將公布於本頁，「Last updated」日期會相應更新。</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">8. 聯絡我們</h2>
            <p>如對 Cookie 使用有任何疑問，請透過平台聯絡功能與我們聯繫。</p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            本 Cookie 政策最後更新日期：2025年12月13日
          </p>
        </div>
      </div>
    </div>
  );
}










