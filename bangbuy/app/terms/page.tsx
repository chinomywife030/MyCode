import TrustFooter from '@/components/TrustFooter';

export const metadata = {
  title: '使用條款 - BangBuy',
  description: 'BangBuy 平台使用條款與服務協議',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm p-8 md:p-12">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">使用條款</h1>
          <p className="text-sm text-gray-500">Terms of Service</p>
          <p className="text-sm text-gray-600 mt-2">Last updated: 2025-12-13</p>
        </div>

        <div className="prose prose-gray max-w-none space-y-6 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">1. 服務說明</h2>
            <p>
              BangBuy 是一個代購媒合平台，連結留學生與海外使用者與台灣端的代購需求。本平台<strong>僅提供資訊媒合功能</strong>，讓使用者能夠發布代購需求或提供代購服務。
            </p>
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mt-4">
              <p className="font-semibold text-amber-800 mb-2">重要：平台不保證交易成功</p>
              <p className="text-amber-700">
                本平台<strong>不直接參與交易、金流、物流或商品真偽判定</strong>。平台不保證任何交易會成功完成，也不對交易結果負責。
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">2. 接受條款</h2>
            <p>使用本平台即表示您已閱讀、理解並同意遵守本使用條款、免責聲明、隱私權政策及 Cookie 政策。若您不同意任何條款，請立即停止使用本平台。</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">3. 帳號註冊與責任</h2>
            <p>您必須提供真實、準確、完整的註冊資訊，並對帳號安全負完全責任。您同意：</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>不得冒用他人身份或提供虛假資訊</li>
              <li>妥善保管帳號密碼，不得與他人共用</li>
              <li>對帳號下的所有活動負責</li>
              <li>發現帳號遭盜用時立即通知平台</li>
            </ul>
            <p className="mt-3 font-semibold">帳號與停權條款：</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>平台保留隨時暫停或終止違反本條款之帳號的權利</li>
              <li>如帳號遭停權，您將無法使用平台服務，且可能無法恢復</li>
              <li>停權後，您仍須對停權前的行為負責</li>
              <li>平台無需事先通知即可執行停權措施</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">4. 禁止行為（Prohibited Conduct）</h2>
            <p className="font-semibold mb-3">使用本平台時，您明確禁止從事以下行為：</p>
            <ol className="list-decimal pl-6 space-y-3">
              <li><strong>禁止詐騙與不當金融行為：</strong>禁止任何詐騙、冒名、釣魚、洗錢、或引導至可疑付款/投資行為。</li>
              <li><strong>禁止虛假與誤導資訊：</strong>禁止發布虛假資訊、誤導性內容、假貨資訊、或刻意隱瞞關鍵交易風險。</li>
              <li><strong>禁止違法商品與服務：</strong>禁止刊登或引導任何違法商品/服務（依適用法令認定）。</li>
              <li><strong>禁止散布個資：</strong>禁止散布個資（包含他人電話、地址、身分證明文件、付款資訊等）或未經同意的私人對話內容。</li>
              <li><strong>禁止騷擾與仇恨言論：</strong>禁止仇恨言論、騷擾、威脅、霸凌、性暗示騷擾或跟蹤行為。</li>
              <li><strong>禁止垃圾訊息與未經授權廣告：</strong>禁止垃圾訊息、洗版、惡意推廣、未經允許的廣告投放或導流。</li>
              <li><strong>禁止干擾平台運作：</strong>禁止以任何方式干擾平台運作：包含攻擊、掃描、注入、破解、DDoS、濫用 API、或嘗試繞過權限控管。</li>
              <li><strong>禁止未授權爬蟲與資料擷取：</strong>禁止爬蟲、批量抓取、鏡像站、或未經授權複製平台內容、資料庫或版面。</li>
              <li><strong>禁止濫用機制：</strong>禁止濫用檢舉/申訴機制或任何形式的惡意行為以傷害他人或平台。</li>
              <li><strong>禁止損害平台利益：</strong>禁止任何會使本平台承擔法律風險或商譽損害之行為。</li>
            </ol>
            <p className="mt-4 font-semibold bg-yellow-50 border-l-4 border-yellow-500 p-4">
              <strong>處置措施：</strong>本平台得在不另行通知下移除內容、限制功能、暫停或終止帳號，並保留配合主管機關調查之權利。
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">5. 使用者內容與責任</h2>
            <p>您發布的所有內容（包含文字、圖片、評論等）：</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>必須合法、真實、不侵犯他人權利</li>
              <li>不得包含個資、詐騙、色情、暴力或違法內容</li>
              <li>您保證擁有完整權利並自行承擔法律責任</li>
              <li>您授權平台展示、儲存、處理該內容</li>
            </ul>
            <p className="mt-3 font-semibold">使用者張貼內容責任：</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>您對發布的所有內容負完全責任</li>
              <li>如內容涉及違法或侵權，您需自行承擔法律後果</li>
              <li>平台有權移除任何違反本條款的內容，無需事先通知</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">6. 交易與金流</h2>
            <p>本平台不介入交易、不處理金流、不保管款項。所有交易行為由使用者自行協商與執行，風險自負。</p>
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mt-4">
              <p className="font-semibold text-red-800 mb-2">平台不負責事項</p>
              <ul className="list-disc pl-6 space-y-1 text-red-700">
                <li>第三方商品品質、真偽、瑕疵</li>
                <li>物流配送延遲、遺失、損壞</li>
                <li>付款糾紛、詐騙、退款問題</li>
                <li>交易糾紛、爭議處理</li>
                <li>任何因交易產生的損失或損害</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">7. 智慧財產權</h2>
            <p>本平台的設計、程式碼、商標、Logo 等均受智慧財產權保護。未經授權不得複製、修改、散布或商業使用。詳見《智慧財產權政策》。</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">8. 服務變更與終止</h2>
            <p>平台保留隨時修改、暫停或終止服務之權利，無需事先通知。平台可因任何理由（包含違反本條款）暫停或終止您的帳號。</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">9. 免責與責任限制</h2>
            <p>本平台依「現況」提供服務，不保證服務不中斷、無錯誤或符合特定目的。</p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-4">
              <p className="font-semibold text-gray-900 mb-2">責任限制：</p>
              <ul className="list-disc pl-6 space-y-1 text-gray-700">
                <li>對於使用本平台產生的任何直接、間接、附帶或衍生損失，平台概不負責</li>
                <li>平台不對任何交易結果、商品品質、服務品質負責</li>
                <li>平台不對因系統故障、網路中斷、資料遺失造成的損失負責</li>
                <li>在法律允許的最大範圍內，平台的責任上限為您支付給平台的費用（如適用）</li>
              </ul>
            </div>
            <p className="mt-4">詳見《免責聲明》。</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">10. 管轄法律</h2>
            <p>本條款適用中華民國法律。因本條款產生之爭議，雙方同意以台灣台北地方法院為第一審管轄法院。</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">11. 條款修改</h2>
            <p>平台保留隨時修改本條款之權利，修改後的條款將公布於本頁。繼續使用服務即表示您接受修改後的條款。</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">12. 聯絡方式</h2>
            <p>如對本條款有任何疑問，請透過以下方式與我們聯繫：</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>電子郵件：<a href="mailto:bangbuy.contact@gmail.com" className="text-blue-600 hover:underline">bangbuy.contact@gmail.com</a></li>
              <li>透過平台內建的聯絡功能</li>
            </ul>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            本使用條款最後更新日期：2025年12月13日
          </p>
        </div>
      </div>
    </div>
  );
}


















