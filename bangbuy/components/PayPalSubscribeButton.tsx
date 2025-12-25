'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Script from 'next/script';

declare global {
  interface Window {
    paypal?: any;
  }
}

type Props = {
  className?: string;
};

export default function PayPalSubscribeButton({ className }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [rendered, setRendered] = useState(false);

  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const planId = process.env.NEXT_PUBLIC_PAYPAL_PLAN_ID;

  const sdkSrc = useMemo(() => {
    // 注意：這是訂閱制必要參數 vault=true & intent=subscription
    return `https://www.paypal.com/sdk/js?client-id=${clientId}&vault=true&intent=subscription`;
  }, [clientId]);

  useEffect(() => {
    if (!scriptReady) return;
    if (!containerRef.current) return;
    if (!clientId || !planId) {
      console.error('[PayPal] Missing env vars', { clientId: !!clientId, planId: !!planId });
      return;
    }
    if (!window.paypal?.Buttons) {
      console.error('[PayPal] SDK loaded but window.paypal.Buttons not found');
      return;
    }

    // 避免重複渲染多顆按鈕
    if (rendered) return;
    containerRef.current.innerHTML = '';

    try {
      window.paypal
        .Buttons({
          style: {
            shape: 'pill',
            color: 'blue',
            layout: 'vertical',
            label: 'subscribe',
          },
          createSubscription: (_data: any, actions: any) => {
            return actions.subscription.create({
              plan_id: planId,
            });
          },
          onApprove: (data: any) => {
            const subscriptionID = data?.subscriptionID;
            console.log('[PayPal] subscription approved:', subscriptionID);
            alert(`訂閱成功：${subscriptionID}`);
          },
          onError: (err: any) => {
            console.error('[PayPal] error:', err);
            alert('PayPal 訂閱發生錯誤，請稍後再試或聯絡客服。');
          },
        })
        .render(containerRef.current);

      setRendered(true);
    } catch (e) {
      console.error('[PayPal] render failed:', e);
    }
  }, [scriptReady, rendered, clientId, planId]);

  // 若 env 沒設，直接顯示提示（避免 production build/runtime 靜默失敗）
  if (!clientId || !planId) {
    return (
      <div className={className}>
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          PayPal 設定缺失：請確認已設定 NEXT_PUBLIC_PAYPAL_CLIENT_ID 與 NEXT_PUBLIC_PAYPAL_PLAN_ID
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <Script
        src={sdkSrc}
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
        onError={(e) => {
          console.error('[PayPal] SDK load error', e);
        }}
      />
      <div ref={containerRef} id="paypal-subscribe-container" />
    </div>
  );
}


