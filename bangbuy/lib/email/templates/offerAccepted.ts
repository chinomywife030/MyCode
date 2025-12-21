/**
 * 📧 Email 模板：報價被接受（代購收）
 */

import { generateEmailHtml, generateEmailText } from './base';

import { getSiteUrl } from '@/lib/siteUrl';

// 🔐 使用統一的 site URL
const APP_URL = getSiteUrl();

export interface OfferAcceptedEmailParams {
  shopperName: string;
  buyerName: string;
  wishTitle: string;
  wishId: string;
  amount: number;
  currency?: string;
  conversationId?: string;
}

export function offerAcceptedEmail(params: OfferAcceptedEmailParams): { html: string; text: string; subject: string } {
  const { shopperName, buyerName, wishTitle, wishId, amount, currency = 'TWD', conversationId } = params;

  const formattedAmount = currency === 'TWD' 
    ? `NT$ ${amount.toLocaleString()}` 
    : `${currency} ${amount.toLocaleString()}`;

  const subject = `🎉 報價已被接受！`;

  const ctaUrl = conversationId 
    ? `${APP_URL}/chat?conversation=${conversationId}`
    : `${APP_URL}/wish/${wishId}`;

  const bodyContent = `
    <p style="margin: 0 0 16px;">Hi ${shopperName || '代購'}，</p>
    <p style="margin: 0 0 24px;">好消息！你的報價已被接受，可以開始與買家溝通了。</p>
    
    <div style="background-color: #ecfdf5; border-radius: 8px; padding: 20px; margin-bottom: 24px; border: 1px solid #a7f3d0;">
      <div style="text-align: center; margin-bottom: 16px;">
        <span style="font-size: 32px;">🎉</span>
      </div>
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">需求名稱</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #1f2937;">${wishTitle}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">買家</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #1f2937;">${buyerName || '買家'}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">成交金額</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 700; font-size: 18px; color: #22c55e;">${formattedAmount}</td>
        </tr>
      </table>
    </div>
    
    <p style="margin: 0; color: #6b7280; font-size: 14px;">
      請盡快與買家聯繫，確認代購細節。
    </p>
  `;

  const html = generateEmailHtml({
    title: '報價已被接受！',
    preheader: `${buyerName || '買家'} 接受了你對「${wishTitle}」的報價`,
    bodyContent,
    ctaText: '開始對話',
    ctaUrl,
    ctaColor: 'green',
  });

  const text = generateEmailText({
    title: '🎉 報價已被接受！',
    bodyLines: [
      `Hi ${shopperName || '代購'}，`,
      '',
      '好消息！你的報價已被接受，可以開始與買家溝通了。',
      '',
      `需求名稱：${wishTitle}`,
      `買家：${buyerName || '買家'}`,
      `成交金額：${formattedAmount}`,
    ],
    ctaText: '開始對話',
    ctaUrl,
  });

  return { html, text, subject };
}



