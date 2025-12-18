/**
 * 📧 Email 服務統一入口
 * 提供各類 Email 發送功能
 */

import { sendEmail, EmailCategory, APP_URL } from './sender';
import {
  offerCreatedEmail,
  offerAcceptedEmail,
  offerRejectedEmail,
  messageDigestEmail,
  OfferCreatedEmailParams,
  OfferAcceptedEmailParams,
  OfferRejectedEmailParams,
  MessageDigestEmailParams,
} from './templates';

// ========== 報價相關 Email ==========

/**
 * 發送「收到新報價」Email 給買家
 */
export async function sendOfferCreatedEmail(params: OfferCreatedEmailParams & {
  buyerEmail: string;
  buyerId: string;
  offerId: string;
}) {
  const { buyerEmail, buyerId, offerId, wishId, ...templateParams } = params;
  
  const { html, text, subject } = offerCreatedEmail({ ...templateParams, wishId });
  
  return sendEmail({
    to: buyerEmail,
    subject,
    html,
    text,
    category: 'offer_created',
    dedupeKey: `offer_created:${wishId}:${offerId}`,
    userId: buyerId,
  });
}

/**
 * 發送「報價被接受」Email 給代購
 */
export async function sendOfferAcceptedEmail(params: OfferAcceptedEmailParams & {
  shopperEmail: string;
  shopperId: string;
  offerId: string;
}) {
  const { shopperEmail, shopperId, offerId, wishId, ...templateParams } = params;
  
  const { html, text, subject } = offerAcceptedEmail({ ...templateParams, wishId });
  
  return sendEmail({
    to: shopperEmail,
    subject,
    html,
    text,
    category: 'offer_accepted',
    dedupeKey: `offer_accepted:${offerId}`,
    userId: shopperId,
  });
}

/**
 * 發送「報價被拒絕」Email 給代購
 */
export async function sendOfferRejectedEmail(params: OfferRejectedEmailParams & {
  shopperEmail: string;
  shopperId: string;
  offerId: string;
}) {
  const { shopperEmail, shopperId, offerId, wishId, ...templateParams } = params;
  
  const { html, text, subject } = offerRejectedEmail({ ...templateParams, wishId });
  
  return sendEmail({
    to: shopperEmail,
    subject,
    html,
    text,
    category: 'offer_rejected',
    dedupeKey: `offer_rejected:${offerId}`,
    userId: shopperId,
  });
}

/**
 * 發送「新訊息摘要」Email
 */
export async function sendMessageDigestEmail(params: MessageDigestEmailParams & {
  recipientEmail: string;
  recipientId: string;
  timeBucket: string;  // YYYYMMDDHHMM (15分鐘一桶)
}) {
  const { recipientEmail, recipientId, timeBucket, conversationId, ...templateParams } = params;
  
  const { html, text, subject } = messageDigestEmail({ ...templateParams, conversationId });
  
  return sendEmail({
    to: recipientEmail,
    subject,
    html,
    text,
    category: 'message_digest',
    dedupeKey: `message_digest:${recipientId}:${conversationId}:${timeBucket}`,
    userId: recipientId,
  });
}

// ========== Utility ==========

/**
 * 獲取當前時間桶（15分鐘）
 */
export function getTimeBucket(): string {
  const now = new Date();
  const minutes = Math.floor(now.getMinutes() / 15) * 15;
  const bucket = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), minutes);
  
  return bucket.toISOString()
    .replace(/[-:T]/g, '')
    .slice(0, 12);
}

export { APP_URL };


