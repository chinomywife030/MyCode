/**
 * 📧 Email 模板：報價被拒絕（代購收）
 */

import { generateEmailHtml, generateEmailText } from './base';

const APP_URL = process.env.APP_URL || 'http://localhost:3000';

export interface OfferRejectedEmailParams {
  shopperName: string;
  buyerName: string;
  wishTitle: string;
  wishId: string;
  amount: number;
  currency?: string;
}

export function offerRejectedEmail(params: OfferRejectedEmailParams): { html: string; text: string; subject: string } {
  const { shopperName, buyerName, wishTitle, wishId, amount, currency = 'TWD' } = params;

  const formattedAmount = currency === 'TWD' 
    ? `NT$ ${amount.toLocaleString()}` 
    : `${currency} ${amount.toLocaleString()}`;

  const subject = `報價未被接受`;

  const bodyContent = `
    <p style="margin: 0 0 16px;">Hi ${shopperName || '代購'}，</p>
    <p style="margin: 0 0 24px;">很遺憾，你的報價未被買家接受。</p>
    
    <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">需求名稱</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #1f2937;">${wishTitle}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">你的報價</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #6b7280;">${formattedAmount}</td>
        </tr>
      </table>
    </div>
    
    <p style="margin: 0 0 16px; color: #6b7280; font-size: 14px;">
      別灰心！平台上還有許多其他需求等著你，繼續尋找適合的代購機會吧。
    </p>
  `;

  const html = generateEmailHtml({
    title: '報價未被接受',
    preheader: `你對「${wishTitle}」的報價未被接受`,
    bodyContent,
    ctaText: '瀏覽更多需求',
    ctaUrl: `${APP_URL}/?tab=wishes`,
    ctaColor: 'blue',
  });

  const text = generateEmailText({
    title: '報價未被接受',
    bodyLines: [
      `Hi ${shopperName || '代購'}，`,
      '',
      '很遺憾，你的報價未被買家接受。',
      '',
      `需求名稱：${wishTitle}`,
      `你的報價：${formattedAmount}`,
      '',
      '別灰心！平台上還有許多其他需求等著你。',
    ],
    ctaText: '瀏覽更多需求',
    ctaUrl: `${APP_URL}/?tab=wishes`,
  });

  return { html, text, subject };
}



