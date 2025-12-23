/**
 * 📧 新私訊 Email 模板
 */

import { getSiteUrl } from '@/lib/siteUrl';

const APP_URL = getSiteUrl();

export type MessageEmailType = 'FIRST_MESSAGE' | 'REPLY_MESSAGE' | 'SYSTEM_MESSAGE' | 'UNREAD_REMINDER';

export interface NewMessageEmailParams {
  recipientName: string;
  senderName: string;
  messageSnippet: string;  // 截斷到 80 字
  conversationId: string;
  messageType: MessageEmailType;
}

/**
 * 取得 Email 標題
 */
function getSubject(messageType: MessageEmailType, senderName: string): string {
  // 根據需求，統一使用「你收到一則新的私訊」
  return '你收到一則新的私訊';
}

/**
 * 取得 Email 開頭文案
 */
function getIntroText(messageType: MessageEmailType, senderName: string): string {
  switch (messageType) {
    case 'FIRST_MESSAGE':
      return `${senderName} 向你發起了一個新的對話：`;
    case 'SYSTEM_MESSAGE':
      return `你收到一則 BangBuy 系統通知：`;
    case 'UNREAD_REMINDER':
      return `你有一些未讀的訊息還沒查看：`;
    case 'REPLY_MESSAGE':
    default:
      return `${senderName} 給你發了一則訊息：`;
  }
}

/**
 * 新私訊 Email 模板
 */
export function newMessageEmail(params: NewMessageEmailParams): {
  html: string;
  text: string;
  subject: string;
} {
  const { recipientName, senderName, messageSnippet, conversationId, messageType } = params;
  
  const subject = getSubject(messageType, senderName);
  const introText = getIntroText(messageType, senderName);
  // 使用現有的聊天路由格式
  const conversationUrl = `${APP_URL}/chat?conversation=${conversationId}`;
  
  // 截斷訊息（確保不超過 80 字）
  const truncatedSnippet = messageSnippet.length > 80 
    ? messageSnippet.substring(0, 77) + '...'
    : messageSnippet;

  const html = `
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
  <div style="max-width: 520px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 24px 32px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">
        ${messageType === 'SYSTEM_MESSAGE' ? '📢' : '💬'} BangBuy
      </h1>
    </div>
    
    <!-- Content -->
    <div style="padding: 32px;">
      <p style="color: #374151; font-size: 16px; margin: 0 0 16px 0;">
        嗨 ${recipientName}，
      </p>
      
      <p style="color: #374151; font-size: 16px; margin: 0 0 24px 0;">
        ${introText}
      </p>
      
      <!-- Message Preview -->
      <div style="background: #f9fafb; border-left: 4px solid #3b82f6; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 0 0 24px 0;">
        <p style="color: #1f2937; font-size: 15px; margin: 0; font-style: italic; line-height: 1.5;">
          「${truncatedSnippet}」
        </p>
        ${messageType !== 'SYSTEM_MESSAGE' ? `
        <p style="color: #6b7280; font-size: 13px; margin: 8px 0 0 0;">
          — ${senderName}
        </p>
        ` : ''}
      </div>
      
      <!-- CTA Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${conversationUrl}" 
           style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);">
          前往查看對話
        </a>
      </div>
      
      <!-- Privacy Notice -->
      <p style="color: #9ca3af; font-size: 12px; margin: 24px 0 0 0; text-align: center; line-height: 1.6;">
        為保護隱私，此 Email 僅顯示訊息摘要。<br>
        完整對話內容請登入 BangBuy 查看。
      </p>
    </div>
    
    <!-- Footer -->
    <div style="background: #f9fafb; padding: 20px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="color: #6b7280; font-size: 12px; margin: 0 0 8px 0;">
        此郵件由 BangBuy 自動發送
      </p>
      <p style="color: #9ca3af; font-size: 11px; margin: 0;">
        如不想收到此類通知，請至 <a href="${APP_URL}/settings" style="color: #3b82f6; text-decoration: none;">設定頁面</a> 調整偏好
      </p>
    </div>
    
  </div>
</body>
</html>
  `.trim();

  const text = `
嗨 ${recipientName}，

${introText}

「${truncatedSnippet}」
${messageType !== 'SYSTEM_MESSAGE' ? `— ${senderName}` : ''}

前往查看對話：${conversationUrl}

---
此郵件由 BangBuy 自動發送。
如不想收到此類通知，請至 ${APP_URL}/settings 調整偏好。
  `.trim();

  return { html, text, subject };
}

