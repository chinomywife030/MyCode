/**
 * 📧 Email 模板：收到新報價（買家收）
 */

import { generateEmailHtml, generateEmailText } from './base';

const APP_URL = process.env.APP_URL || 'http://localhost:3000';

export interface OfferCreatedEmailParams {
  buyerName: string;
  shopperName: string;
  wishTitle: string;
  wishId: string;
  amount: number;
  currency?: string;
  message?: string;
}

export function offerCreatedEmail(params: OfferCreatedEmailParams): { html: string; text: string; subject: string } {
  const { buyerName, shopperName, wishTitle, wishId, amount, currency = 'TWD', message } = params;

  const formattedAmount = currency === 'TWD' 
    ? `NT$ ${amount.toLocaleString()}` 
    : `${currency} ${amount.toLocaleString()}`;

  const subject = `有人對「${wishTitle}」報價了！`;

  const bodyContent = `
    <p style="margin: 0 0 16px;">Hi ${buyerName || '買家'}，</p>
    <p style="margin: 0 0 24px;">你的需求收到了一筆新報價！</p>
    
    <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">需求名稱</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #1f2937;">${wishTitle}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">報價者</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #1f2937;">${shopperName || '一位代購'}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">報價金額</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 700; font-size: 18px; color: #f97316;">${formattedAmount}</td>
        </tr>
        ${message ? `
        <tr>
          <td colspan="2" style="padding: 12px 0 0; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">備註說明</p>
            <p style="margin: 8px 0 0; color: #1f2937;">${message}</p>
          </td>
        </tr>
        ` : ''}
      </table>
    </div>
    
    <p style="margin: 0; color: #6b7280; font-size: 14px;">
      你可以查看報價詳情，決定是否接受。
    </p>
  `;

  const html = generateEmailHtml({
    title: '收到新報價',
    preheader: `${shopperName || '一位代購'} 對你的需求報價 ${formattedAmount}`,
    bodyContent,
    ctaText: '查看報價',
    ctaUrl: `${APP_URL}/wish/${wishId}`,
    ctaColor: 'orange',
  });

  const text = generateEmailText({
    title: '收到新報價',
    bodyLines: [
      `Hi ${buyerName || '買家'}，`,
      '',
      '你的需求收到了一筆新報價！',
      '',
      `需求名稱：${wishTitle}`,
      `報價者：${shopperName || '一位代購'}`,
      `報價金額：${formattedAmount}`,
      message ? `備註：${message}` : '',
    ].filter(Boolean),
    ctaText: '查看報價',
    ctaUrl: `${APP_URL}/wish/${wishId}`,
  });

  return { html, text, subject };
}


