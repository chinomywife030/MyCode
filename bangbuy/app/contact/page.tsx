import { Metadata } from 'next';
import TrustFooter from '@/components/TrustFooter';

export const metadata: Metadata = {
  title: '聯絡我們 - BangBuy',
  description: '聯絡 BangBuy 客服，問題回報與合作洽談',
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm p-8 md:p-12">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">聯絡我們</h1>
          <p className="text-sm text-gray-500">Contact Us</p>
        </div>

        <div className="prose prose-gray max-w-none space-y-6 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">聯絡方式</h2>
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
              <p className="font-semibold text-blue-800 mb-2">📧 電子郵件</p>
              <p className="text-blue-700">
                <a href="mailto:support@bangbuy.app" className="text-blue-600 hover:underline font-medium">
                  support@bangbuy.app
                </a>
              </p>
            </div>
            <p>
              我們會盡快回覆您的來信。請在信件中提供以下資訊，以便我們更快速地協助您：
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>您的帳號 Email（如已註冊）</li>
              <li>問題類型或合作性質</li>
              <li>詳細描述或需求說明</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">回覆時效</h2>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <ul className="space-y-3">
                <li>
                  <strong className="text-gray-900">一般問題回報：</strong>
                  <span className="text-gray-600 ml-2">我們會在 2-3 個工作天內回覆</span>
                </li>
                <li>
                  <strong className="text-gray-900">緊急技術問題：</strong>
                  <span className="text-gray-600 ml-2">我們會優先處理，通常在 24 小時內回覆</span>
                </li>
                <li>
                  <strong className="text-gray-900">合作洽談：</strong>
                  <span className="text-gray-600 ml-2">我們會在 3-5 個工作天內回覆</span>
                </li>
              </ul>
            </div>
            <p className="mt-4 text-sm text-gray-600">
              <strong>注意：</strong>如遇週末或國定假日，回覆時間可能會順延。感謝您的耐心等候。
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">聯絡用途</h2>
            <p>您可以透過上述聯絡方式與我們聯繫以下事項：</p>
            <div className="grid md:grid-cols-2 gap-4 mt-4">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">問題回報</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 帳號相關問題</li>
                  <li>• 功能使用問題</li>
                  <li>• 技術錯誤回報</li>
                  <li>• 平台建議</li>
                </ul>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">合作洽談</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 商業合作提案</li>
                  <li>• 媒體採訪</li>
                  <li>• 其他合作機會</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">其他聯絡方式</h2>
            <p>
              除了電子郵件外，您也可以透過平台內建的訊息系統與我們聯繫。登入後，您可以在個人設定或幫助中心找到相關功能。
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">常見問題</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Q: 為什麼我還沒收到回覆？</h3>
                <p className="text-sm text-gray-600">
                  A: 請確認您的 Email 是否正確，並檢查垃圾郵件資料夾。如超過回覆時效仍未收到回覆，請再次來信並註明「再次詢問」。
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Q: 可以電話聯絡嗎？</h3>
                <p className="text-sm text-gray-600">
                  A: 目前我們主要透過 Email 提供客服支援。如有緊急事項，請在 Email 主旨標註「緊急」，我們會優先處理。
                </p>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            最後更新日期：{new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* 🔒 Trust Footer */}
      <TrustFooter className="py-8" />
    </div>
  );
}



