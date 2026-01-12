/**
 * 通知文案組裝工具
 * 根據不同的通知類型，組裝更具體的 title 和 body
 */

export interface NotificationContentParams {
  type: string;
  senderName?: string;
  wishTitle?: string;
  shopperName?: string;
  destination?: string;
  messageContent?: string;
  [key: string]: any; // 允許其他參數
}

export interface NotificationContent {
  title: string;
  body: string;
}

/**
 * 根據通知類型組裝 title 和 body
 */
export function buildNotificationContent(params: NotificationContentParams): NotificationContent {
  const { type, senderName, wishTitle, shopperName, destination, messageContent } = params;
  
  // 安全 fallback 值
  const safeSenderName = senderName || '有人';
  const safeWishTitle = wishTitle || '你的需求';
  const safeShopperName = shopperName || '代購夥伴';
  const safeDestination = destination || '目的地';
  const safeMessageContent = messageContent || '';

  // 根據 type 組裝內容
  switch (type.toLowerCase()) {
    case 'chat':
    case 'message':
    case 'chat_message':
      return {
        title: '新訊息',
        body: `${safeSenderName} 傳送了一則新訊息`,
      };

    case 'new_wish':
    case 'wish_created':
      return {
        title: '新需求出現',
        body: `有人發布新需求：${safeWishTitle}`,
      };

    case 'wish_quote':
    case 'new_quote':
    case 'new_reply':
      return {
        title: '收到新報價',
        body: `有人對你的需求「${safeWishTitle}」提出報價`,
      };

    case 'wish_message':
    case 'interaction':
      return {
        title: '需求有新互動',
        body: `${safeSenderName} 對你的需求「${safeWishTitle}」傳送訊息`,
      };

    case 'trip_created':
      return {
        title: '有新行程',
        body: `${safeShopperName} 新增了一個前往 ${safeDestination} 的行程`,
      };

    default:
      // 預設 fallback
      return {
        title: 'BangBuy',
        body: '你有一則新通知',
      };
  }
}
