export const metadata = {
  title: '免責聲明 - BangBuy',
  description: 'BangBuy 平台免責聲明與責任限制',
};

export default function DisclaimerPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm p-8 md:p-12">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">免責聲明</h1>
          <p className="text-sm text-gray-500">Disclaimer</p>
          <p className="text-sm text-gray-600 mt-2">Last updated: 2025-12-13</p>
        </div>

        <div className="prose prose-gray max-w-none space-y-6 text-gray-700 leading-relaxed">
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
            <p className="font-semibold text-red-800">
              重要提示：BangBuy 僅提供資訊媒合平台，不介入交易、金流或物流。使用者應自行承擔所有交易風險。
            </p>
          </div>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">1. 平台角色定位</h2>
            <p>BangBuy 為代購資訊媒合平台，提供使用者發布需求與瀏覽資訊之功能。本平台：</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>不是交易方</strong>：不參與任何買賣交易，不是買方也不是賣方</li>
              <li><strong>不處理金流</strong>：不保管、不代收、不轉付任何款項</li>
              <li><strong>不介入物流</strong>：不負責商品運送、保管或交付</li>
              <li><strong>不驗證商品</strong>：不鑑定商品真偽、品質或合法性</li>
              <li><strong>不保證成交</strong>：媒合成功與否由使用者自行決定</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">2. 使用者資訊免責</h2>
            <p>本平台對使用者發布的資訊：</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>不保證真實性、準確性、完整性或時效性</li>
              <li>不對虛假、誤導或侵權內容負責</li>
              <li>不對使用者身份真偽進行實質審查</li>
              <li>發布者應自行承擔內容法律責任</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">3. 交易風險免責</h2>
            <p className="font-semibold mb-2">使用者透過本平台進行任何交易行為，應自行承擔以下風險：</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>詐騙風險</strong>：包含但不限於假冒身份、虛假商品、收款後失聯等</li>
              <li><strong>金錢損失</strong>：包含但不限於預付款項無法取回、商品價值不符等</li>
              <li><strong>商品風險</strong>：包含但不限於假貨、瑕疵品、違禁品、侵權商品等</li>
              <li><strong>運送風險</strong>：包含但不限於遺失、損壞、延誤、海關扣押等</li>
              <li><strong>糾紛風險</strong>：包含但不限於買賣雙方認知不一致、服務不滿意等</li>
              <li><strong>法律風險</strong>：包含但不限於違反進出口法規、侵權、逃漏稅等</li>
            </ul>
            <p className="mt-4 font-semibold bg-yellow-50 border-l-4 border-yellow-500 p-4">
              <strong>特別提醒：</strong>請勿向陌生人轉帳或提供付款資訊。本平台對交易糾紛、詐騙或金錢損失不負任何賠償責任。
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">4. 第三方連結與服務免責</h2>
            <p>本平台可能包含外部連結或第三方服務：</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>外部連結由第三方提供，本平台不負責其內容、隱私政策或運作</li>
              <li>使用者點擊外部連結即離開本平台，風險自負</li>
              <li>本平台不對第三方服務或商品負責</li>
              <li>第三方服務的使用應遵守其條款與政策</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">5. 服務可用性免責</h2>
            <p>本平台依「現況」提供服務，不保證：</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>服務不中斷、不延誤、無錯誤或無病毒</li>
              <li>資訊儲存不會遺失或損壞</li>
              <li>功能符合使用者特定需求或期望</li>
              <li>平台永久運作或不變更功能</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">6. 責任限制</h2>
            <p>在法律允許的最大範圍內，本平台對以下情況不負任何責任：</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>任何直接、間接、附帶、特殊、衍生或懲罰性損失</li>
              <li>利潤損失、商譽損失、資料遺失或業務中斷</li>
              <li>使用或無法使用服務導致的任何損失</li>
              <li>使用者之間的交易糾紛或法律問題</li>
              <li>第三方行為或不可抗力因素</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">7. 安全建議（非保證）</h2>
            <p>平台提供以下建議以降低風險，但不保證安全：</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>優先選擇評價良好的使用者</li>
              <li>使用平台內聊天功能保留紀錄</li>
              <li>確認商品細節與價格後再付款</li>
              <li>避免使用現金或無法追蹤的付款方式</li>
              <li>懷疑詐騙時立即停止交易並檢舉</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">8. 使用者責任</h2>
            <p>使用者應：</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>自行評估交易風險並審慎決定</li>
              <li>遵守當地法律與海關規定</li>
              <li>確保交易內容合法且不侵權</li>
              <li>自行處理稅務、保險等相關事宜</li>
              <li>對自己的行為與決定負完全責任</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">9. 爭議處理</h2>
            <p>如發生交易糾紛：</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>使用者應自行協商解決</li>
              <li>平台可提供有限的通訊紀錄（如有保存）</li>
              <li>平台不介入調解或仲裁</li>
              <li>必要時請尋求法律途徑或向主管機關申訴</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">10. 免責聲明修改</h2>
            <p>平台保留隨時修改本免責聲明之權利。修改後的聲明將公布於本頁，繼續使用服務即表示接受修改內容。</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">11. 聯絡與檢舉</h2>
            <p>如發現違法或不當內容，請透過平台檢舉功能回報。平台將依情況決定是否移除內容或採取其他措施，但不保證立即處理或通知結果。</p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            本免責聲明最後更新日期：2025年12月13日
          </p>
        </div>
      </div>
    </div>
  );
}










