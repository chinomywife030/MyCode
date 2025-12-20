/**
 * 📧 Email 模板：新訊息摘要（聚合通知）
 */

import { generateEmailHtml, generateEmailText } from './base';

const APP_URL = process.env.APP_URL || 'http://localhost:3000';

export interface MessageDigestEmailParams {
  recipientName: string;
  senderName: string;
  conversationId: string;
  unreadCount: number;
  contextTitle?: string;  // 例如需求標題
}

export function messageDigestEmail(params: MessageDigestEmailParams): { html: string; text: string; subject: string } {
  const { recipientName, senderName, conversationId, unreadCount, contextTitle } = params;

  const subject = `${senderName || '有人'} 傳了訊息給你`;

  const bodyContent = `
    <p style="margin: 0 0 16px;">Hi ${recipientName || '用戶'}，</p>
    <p style="margin: 0 0 24px;">你有未讀訊息！</p>
    
    <div style="background-color: #eff6ff; border-radius: 8px; padding: 20px; margin-bottom: 24px; border: 1px solid #bfdbfe;">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
        <div style="width: 48px; height: 48px; background-color: #3b82f6; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
          <span style="color: #ffffff; font-size: 20px; font-weight: 600;">${(senderName || '?').charAt(0).toUpperCase()}</span>
        </div>
        <div>
          <p style="margin: 0; font-weight: 600; color: #1f2937; font-size: 16px;">${senderName || '用戶'}</p>
          ${contextTitle ? `<p style="margin: 4px 0 0; color: #6b7280; font-size: 13px;">關於「${contextTitle}」</p>` : ''}
        </div>
      </div>
      <p style="margin: 0; color: #3b82f6; font-weight: 600; font-size: 15px;">
        ${unreadCount} 則未讀訊息
      </p>
    </div>
    
    <p style="margin: 0; color: #6b7280; font-size: 14px;">
      點擊下方按鈕查看完整對話內容。
    </p>
  `;

  const html = generateEmailHtml({
    title: '你有新訊息',
    preheader: `${senderName || '有人'} 傳了 ${unreadCount} 則訊息給你`,
    bodyContent,
    ctaText: '查看訊息',
    ctaUrl: `${APP_URL}/chat?conversation=${conversationId}`,
    ctaColor: 'blue',
  });

  const text = generateEmailText({
    title: '你有新訊息',
    bodyLines: [
      `Hi ${recipientName || '用戶'}，`,
      '',
      '你有未讀訊息！',
      '',
      `來自：${senderName || '用戶'}`,
      contextTitle ? `關於：${contextTitle}` : '',
      `未讀數量：${unreadCount} 則`,
    ].filter(Boolean),
    ctaText: '查看訊息',
    ctaUrl: `${APP_URL}/chat?conversation=${conversationId}`,
  });

  return { html, text, subject };
}



