import { Metadata } from 'next';
import TrustFooter from '@/components/TrustFooter';

export const metadata: Metadata = {
  title: '關於我們 - BangBuy',
  description: 'BangBuy 是留學生與海外使用者與台灣端需求的媒合工具，目前不介入交易與付款',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm p-8 md:p-12">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">關於 BangBuy</h1>
          <p className="text-sm text-gray-500">About Us</p>
        </div>

        <div className="prose prose-gray max-w-none space-y-6 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">什麼是 BangBuy？</h2>
            <p>
              BangBuy 是一個專為留學生與海外使用者設計的代購媒合平台。我們連結在海外生活的使用者與台灣端的代購需求，讓跨國代購變得更加便利。
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">我們的服務</h2>
            <p>
              BangBuy 提供一個資訊媒合平台，讓使用者能夠：
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li><strong>發布代購需求</strong>：台灣的使用者可以發布想要購買的海外商品需求</li>
              <li><strong>提供代購服務</strong>：在海外生活的使用者可以發布代購行程，協助購買商品</li>
              <li><strong>媒合配對</strong>：平台協助雙方找到合適的配對對象</li>
              <li><strong>溝通協商</strong>：提供安全的訊息系統讓雙方進行溝通與協商</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">重要說明</h2>
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-4">
              <p className="font-semibold text-amber-800 mb-2">平台定位</p>
              <p className="text-amber-700">
                BangBuy 目前<strong>不介入交易與付款</strong>。我們僅提供資訊媒合服務，所有交易細節（包含價格、付款方式、運送方式等）均由使用者自行協商決定。
              </p>
            </div>
            <p>
              這意味著：
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>平台不處理任何金流或付款</li>
              <li>平台不負責商品品質、真偽判定或物流配送</li>
              <li>平台不介入交易糾紛或爭議處理</li>
              <li>使用者需自行評估交易風險並承擔責任</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">我們的願景</h2>
            <p>
              我們希望透過 BangBuy 平台，讓跨國代購變得更加透明、便利且安全。無論您是在海外生活的留學生，或是在台灣有代購需求的使用者，都能透過我們的平台找到合適的合作夥伴。
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">聯絡我們</h2>
            <p>
              如有任何問題或建議，歡迎透過以下方式與我們聯繫：
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>電子郵件：<a href="mailto:support@bangbuy.app" className="text-blue-600 hover:underline">support@bangbuy.app</a></li>
              <li>透過平台內建的聯絡功能</li>
            </ul>
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


