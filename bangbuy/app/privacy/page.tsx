import TrustFooter from '@/components/TrustFooter';

export const metadata = {
  title: '隱私權政策 - BangBuy',
  description: 'BangBuy 隱私權政策與個人資料保護說明（符合 GDPR）',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm p-8 md:p-12">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">隱私權政策</h1>
          <p className="text-sm text-gray-500">Privacy Policy (GDPR Compliant)</p>
          <p className="text-sm text-gray-600 mt-2">Last updated: 2025-12-13</p>
        </div>

        <div className="prose prose-gray max-w-none space-y-6 text-gray-700 leading-relaxed">
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
            <p className="font-semibold text-blue-800">
              本隱私權政策說明 BangBuy 如何蒐集、使用、揭露與保護您的個人資料，並符合 GDPR（一般資料保護規範）要求。
            </p>
          </div>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">1. 資料控制者</h2>
            <p>BangBuy 為本平台之資料控制者，負責處理您的個人資料。如有隱私相關疑問，請透過平台聯絡功能與我們聯繫。</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">2. 我們蒐集的資料</h2>
            <p>我們可能蒐集以下類型的個人資料：</p>
            
            <h3 className="text-xl font-semibold text-gray-800 mt-4 mb-2">2.1 帳號資料</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Email 地址、密碼（加密儲存）、暱稱、顯示名稱</li>
              <li>頭貼、自我介紹等個人資料</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mt-4 mb-2">2.2 使用紀錄</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>發布的需求、代購行程、訊息內容</li>
              <li>頁面瀏覽紀錄、點擊行為、使用時間</li>
              <li>報價金額、交易紀錄（不包含付款資訊）</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mt-4 mb-2">2.3 裝置資訊</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>IP 位址、瀏覽器類型、作業系統</li>
              <li>裝置識別碼、語言設定</li>
              <li>Cookie 與類似技術（詳見 Cookie 政策）</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">3. 資料使用目的</h2>
            <p>我們基於以下合法目的使用您的資料：</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>提供服務</strong>：帳號管理、媒合功能、通知系統、訊息傳遞</li>
              <li><strong>改善體驗</strong>：分析使用行為、優化功能、修復錯誤、提升使用者體驗</li>
              <li><strong>安全</strong>：防止詐騙、濫用、違法行為、保護平台與使用者安全</li>
              <li><strong>法律遵循</strong>：配合主管機關調查、遵守適用法律與規範</li>
              <li><strong>溝通聯繫</strong>：重要通知、服務更新（可選擇退訂）</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">4. 法律依據（GDPR）</h2>
            <p>我們處理個人資料的法律依據包括：</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>合約履行</strong>：提供您使用的服務</li>
              <li><strong>同意</strong>：您明確同意特定處理行為</li>
              <li><strong>合法利益</strong>：改善服務、防止詐騙、確保安全</li>
              <li><strong>法律義務</strong>：遵守適用法律與規範</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">5. 資料分享與揭露</h2>
            <p>我們不會販售您的個人資料。我們僅在以下情況分享資料：</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>服務提供商</strong>：雲端主機、資料庫、分析工具（已簽訂資料處理協議）</li>
              <li><strong>法律要求</strong>：主管機關要求、法院命令、法律程序</li>
              <li><strong>安全保護</strong>：防止詐騙、保護權利、緊急情況</li>
              <li><strong>經您同意</strong>：其他您明確同意的情況</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">6. 跨境資料傳輸</h2>
            <p>您的資料可能儲存於或傳輸至不同國家/地區的伺服器。我們確保資料傳輸符合 GDPR 要求，並採取適當保護措施。</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">7. 資料保存期限</h2>
            <p>我們保存資料的期限依目的而定：</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>帳號資料</strong>：帳號存在期間＋合理期限（用於糾紛處理）</li>
              <li><strong>交易紀錄</strong>：依法律要求保存（通常 5-7 年）</li>
              <li><strong>使用紀錄</strong>：通常 12-24 個月後匿名化或刪除</li>
              <li><strong>Cookie</strong>：依 Cookie 類型，詳見 Cookie 政策</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">8. 您的權利（GDPR）</h2>
            <p>根據 GDPR，您享有以下權利：</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>存取權</strong>：要求查看我們持有的您的個人資料</li>
              <li><strong>更正權</strong>：要求更正不正確或不完整的資料</li>
              <li><strong>刪除權（被遺忘權）</strong>：要求刪除您的個人資料</li>
              <li><strong>限制處理權</strong>：要求限制特定處理行為</li>
              <li><strong>資料可攜權</strong>：要求以結構化格式取得資料</li>
              <li><strong>反對權</strong>：反對基於合法利益的處理</li>
              <li><strong>撤回同意權</strong>：隨時撤回先前給予的同意</li>
            </ul>
            <p className="mt-3">如需行使上述權利，請透過平台聯絡功能與我們聯繫。我們將在 30 天內回應。</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">9. 資料安全</h2>
            <p>我們採取合理的技術與組織措施保護您的資料：</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>密碼加密儲存（bcrypt 或類似技術）</li>
              <li>HTTPS 加密傳輸</li>
              <li>定期安全更新與監控</li>
              <li>存取權限控管</li>
            </ul>
            <p className="mt-3">然而，沒有任何系統是完全安全的。我們無法保證絕對安全，但會持續努力改善。</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">10. 兒童隱私</h2>
            <p>本平台不針對 13 歲以下兒童。我們不會故意蒐集兒童的個人資料。如發現已蒐集兒童資料，我們將立即刪除。</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">11. Cookie 與追蹤技術</h2>
            <p>我們使用 Cookie 與類似技術來：</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>維持您的登入狀態</li>
              <li>記住您的偏好設定</li>
              <li>分析網站使用情況</li>
              <li>提供個人化內容（如未來啟用廣告服務）</li>
            </ul>
            <p className="mt-3">
              <strong>Cookie 管理：</strong>您可透過瀏覽器設定管理 Cookie（通常在「設定」→「隱私權」→「Cookie」），包括：
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>查看與刪除 Cookie</li>
              <li>封鎖特定 Cookie</li>
              <li>設定 Cookie 通知</li>
            </ul>
            <p className="mt-3">
              請注意，停用 Cookie 可能影響部分功能（如登入狀態、偏好設定）。詳細資訊請參閱《Cookie 政策》。
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">12. 第三方服務</h2>
            <p>本平台可能使用以下第三方服務：</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>分析工具</strong>：我們可能使用 Google Analytics 等分析工具來了解使用者行為，以改善服務品質</li>
              <li><strong>未來廣告服務</strong>：我們可能使用 Google AdSense 等廣告服務來提供相關內容（您可透過 Cookie 設定管理）</li>
              <li><strong>雲端服務</strong>：我們使用 Supabase、Vercel 等雲端服務提供商來儲存與處理資料</li>
            </ul>
            <p className="mt-3">
              第三方的隱私實務不受本政策約束，請參閱其各自的隱私權政策。我們會確保第三方服務提供商符合資料保護標準。
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">13. 政策變更</h2>
            <p>我們可能不定期更新本政策。重大變更將透過電子郵件或平台通知告知。繼續使用服務即表示接受更新後的政策。</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">14. 聯絡與申訴</h2>
            <p>如對隱私實務有疑問或投訴，請透過以下方式與我們聯繫：</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>電子郵件：<a href="mailto:support@bangbuy.app" className="text-blue-600 hover:underline">support@bangbuy.app</a></li>
              <li>透過平台內建的聯絡功能</li>
            </ul>
            <p className="mt-3">
              您也有權向當地資料保護主管機關提出申訴。
            </p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            本隱私權政策最後更新日期：2025年12月13日
          </p>
        </div>
      </div>

      {/* 🔒 Trust Footer */}
      <TrustFooter className="py-8" />
    </div>
  );
}


















