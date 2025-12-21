/**
 * 📧 Email 模板基礎結構
 * 簡潔設計，避免進垃圾信
 */

import { getSiteUrl } from '@/lib/siteUrl';

// 🔐 使用統一的 site URL，確保 Email 連結正確
const APP_URL = getSiteUrl();

export interface BaseTemplateParams {
  title: string;
  preheader?: string;
  bodyContent: string;
  ctaText?: string;
  ctaUrl?: string;
  ctaColor?: 'blue' | 'orange' | 'green';
}

/**
 * 生成 Email HTML 模板
 */
export function generateEmailHtml(params: BaseTemplateParams): string {
  const { title, preheader, bodyContent, ctaText, ctaUrl, ctaColor = 'blue' } = params;

  const ctaColors = {
    blue: '#3b82f6',    // 買家主色
    orange: '#f97316',  // 代購主色
    green: '#22c55e',   // 成功色
  };

  const ctaHtml = ctaText && ctaUrl ? `
    <div style="text-align: center; margin: 32px 0;">
      <a href="${ctaUrl}" 
         style="display: inline-block; padding: 14px 32px; background-color: ${ctaColors[ctaColor]}; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 8px;">
        ${ctaText}
      </a>
    </div>
  ` : '';

  return `
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  ${preheader ? `<span style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${preheader}</span>` : ''}
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #f3f4f6;">
              <a href="${APP_URL}" style="text-decoration: none;">
                <span style="font-size: 24px; font-weight: 700; color: #1f2937;">BangBuy</span>
              </a>
            </td>
          </tr>
          
          <!-- Title -->
          <tr>
            <td style="padding: 32px 32px 16px;">
              <h2 style="margin: 0; font-size: 22px; font-weight: 600; color: #1f2937; text-align: center;">
                ${title}
              </h2>
            </td>
          </tr>
          
          <!-- Body Content -->
          <tr>
            <td style="padding: 0 32px;">
              <div style="font-size: 16px; line-height: 1.6; color: #4b5563;">
                ${bodyContent}
              </div>
            </td>
          </tr>
          
          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 32px 32px;">
              ${ctaHtml}
            </td>
          </tr>
          
          <!-- Security Notice -->
          <tr>
            <td style="padding: 0 32px 32px;">
              <p style="margin: 0; font-size: 13px; color: #9ca3af; text-align: center;">
                若非本人操作，請忽略此信。
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #f9fafb; border-top: 1px solid #f3f4f6;">
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td style="text-align: center;">
                    <p style="margin: 0 0 8px; font-size: 13px; color: #6b7280;">
                      <a href="${APP_URL}/privacy" style="color: #6b7280; text-decoration: none;">隱私權政策</a>
                      &nbsp;·&nbsp;
                      <a href="${APP_URL}/terms" style="color: #6b7280; text-decoration: none;">服務條款</a>
                    </p>
                    <p style="margin: 0; font-size: 13px; color: #9ca3af;">
                      聯絡我們：<a href="mailto:support@bangbuy.app" style="color: #9ca3af;">support@bangbuy.app</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * 生成純文字版本
 */
export function generateEmailText(params: {
  title: string;
  bodyLines: string[];
  ctaText?: string;
  ctaUrl?: string;
}): string {
  const { title, bodyLines, ctaText, ctaUrl } = params;
  
  let text = `${title}\n${'='.repeat(40)}\n\n`;
  text += bodyLines.join('\n');
  
  if (ctaText && ctaUrl) {
    text += `\n\n${ctaText}：${ctaUrl}`;
  }
  
  text += '\n\n---\n';
  text += '若非本人操作，請忽略此信。\n\n';
  text += `隱私權政策：${APP_URL}/privacy\n`;
  text += `服務條款：${APP_URL}/terms\n`;
  text += '聯絡我們：support@bangbuy.app\n';
  
  return text;
}



