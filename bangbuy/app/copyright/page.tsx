export const metadata = {
  title: '智慧財產權政策 - BangBuy',
  description: 'BangBuy 智慧財產權與版權保護政策',
};

export default function CopyrightPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm p-8 md:p-12">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">智慧財產權政策</h1>
          <p className="text-sm text-gray-500">Intellectual Property & Copyright Policy</p>
          <p className="text-sm text-gray-600 mt-2">Last updated: 2025-12-13</p>
        </div>

        <div className="prose prose-gray max-w-none space-y-6 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">1. 平台智慧財產權</h2>
            <p>BangBuy 平台的以下內容受智慧財產權法律保護，屬於平台或其授權方所有：</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>網站設計</strong>：版面配置、視覺設計、UI/UX 元素</li>
              <li><strong>商標與 Logo</strong>：BangBuy 名稱、標誌、圖示</li>
              <li><strong>程式碼</strong>：網站原始碼、資料庫結構、API</li>
              <li><strong>文字內容</strong>：平台自行撰寫的說明、教學、條款</li>
              <li><strong>圖片素材</strong>：平台設計或購買的視覺素材</li>
            </ul>
            <p className="mt-3">未經明確書面授權，不得複製、修改、散布、展示、出租或商業使用上述內容。</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">2. 使用者內容權利與授權</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mt-4 mb-2">2.1 您保留所有權</h3>
            <p>您發布的內容（包含文字、圖片、評論等）之智慧財產權仍屬於您所有。</p>

            <h3 className="text-xl font-semibold text-gray-800 mt-4 mb-2">2.2 您授權平台使用</h3>
            <p>發布內容時，您授予平台以下非專屬、全球性、免授權金、可再授權的權利：</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>展示您的內容於平台上</li>
              <li>儲存、複製、處理內容以提供服務</li>
              <li>根據您的隱私設定分享內容</li>
              <li>用於行銷推廣（匿名化或經您同意）</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mt-4 mb-2">2.3 您的保證</h3>
            <p>發布內容時，您保證：</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>您擁有完整權利或已取得必要授權</li>
              <li>內容不侵犯他人的智慧財產權、隱私權或其他權利</li>
              <li>內容合法且不違反本平台政策</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">3. 禁止侵權行為</h2>
            <p className="font-semibold mb-2">嚴格禁止以下侵權行為：</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>盜用內容</strong>：複製他人的文字、圖片、影片等</li>
              <li><strong>假貨與仿冒</strong>：刊登或推廣假冒、仿冒、侵權商品</li>
              <li><strong>商標侵權</strong>：未經授權使用他人商標或品牌名稱</li>
              <li><strong>著作權侵權</strong>：使用未經授權的圖片、音樂、影片等</li>
              <li><strong>專利侵權</strong>：侵犯他人專利權的商品或服務</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">4. 侵權通知與處理（DMCA）</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mt-4 mb-2">4.1 如果您是權利人</h3>
            <p>如發現平台上的內容侵犯您的智慧財產權，請提供以下資訊：</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>您的聯絡資訊（姓名、Email、地址、電話）</li>
              <li>被侵權作品的描述與證明</li>
              <li>侵權內容的具體位置（URL 或頁面連結）</li>
              <li>聲明資訊真實且您是權利人或其授權代表</li>
              <li>簽名（電子簽名亦可）</li>
            </ul>
            <p className="mt-3">請透過平台聯絡功能或檢舉機制提交通知。</p>

            <h3 className="text-xl font-semibold text-gray-800 mt-4 mb-2">4.2 平台處理流程</h3>
            <p>收到有效的侵權通知後，我們將：</p>
            <ol className="list-decimal pl-6 mt-2 space-y-1">
              <li>審查通知的完整性與合理性</li>
              <li>必要時移除或停用涉嫌侵權的內容</li>
              <li>通知發布者（如適用）</li>
              <li>記錄侵權紀錄，重複侵權者可能被停權</li>
            </ol>

            <h3 className="text-xl font-semibold text-gray-800 mt-4 mb-2">4.3 反通知（Counter-Notice）</h3>
            <p>如您認為內容被誤判移除，可提交反通知說明理由。我們將依情況決定是否恢復內容。</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">5. 重複侵權政策</h2>
            <p>我們對重複侵權者採取零容忍政策：</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>首次侵權：警告並移除內容</li>
              <li>二次侵權：暫時停權 7-30 天</li>
              <li>三次以上：永久停權並保留法律追訴權</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">6. 商標使用規範</h2>
            <p>未經書面授權，不得：</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>使用 BangBuy 商標、Logo 或名稱</li>
              <li>建立混淆或誤導的相似標誌</li>
              <li>暗示與平台的關聯、背書或合作關係</li>
              <li>將商標用於商業用途或產品包裝</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">7. 合理使用（Fair Use）</h2>
            <p>某些情況下的合理使用可能不構成侵權（依適用法律認定），例如：</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>評論、批評或新聞報導</li>
              <li>教育或研究目的</li>
              <li>轉換性使用（大幅改變原作目的或性質）</li>
            </ul>
            <p className="mt-3">然而，是否構成合理使用需個案判斷，我們建議在使用他人內容前取得授權。</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">8. 連結政策</h2>
            <p>您可以連結到本平台的公開頁面，但需遵守以下規範：</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>不得以框架（Frame）或內嵌方式展示平台內容</li>
              <li>不得暗示或誤導為平台的官方連結</li>
              <li>不得用於違法、詐騙或不當目的</li>
              <li>平台保留隨時撤回連結許可的權利</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">9. 第三方內容</h2>
            <p>平台可能包含第三方內容或連結：</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>第三方內容的智慧財產權屬於其所有者</li>
              <li>平台不對第三方內容的合法性或侵權行為負責</li>
              <li>使用第三方內容應遵守其授權條款</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">10. 開放原始碼與第三方授權</h2>
            <p>本平台使用的部分開放原始碼軟體或第三方元件受其各自的授權條款約束。相關授權資訊可於平台原始碼或文件中查閱。</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">11. 免責聲明</h2>
            <p>平台對使用者發布的內容不進行事前審查。若使用者內容侵權：</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>侵權責任由發布者自行承擔</li>
              <li>平台不對使用者侵權行為負責</li>
              <li>平台將配合權利人移除侵權內容</li>
              <li>平台保留向侵權者求償的權利</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">12. 政策修改</h2>
            <p>平台保留隨時修改本政策之權利。修改後的政策將公布於本頁，「Last updated」日期會相應更新。</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">13. 聯絡方式</h2>
            <p>如對智慧財產權有任何疑問或需提交侵權通知，請透過平台聯絡功能與我們聯繫。</p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            本智慧財產權政策最後更新日期：2025年12月13日
          </p>
        </div>
      </div>
    </div>
  );
}



















