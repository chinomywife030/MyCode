'use server';

import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

// 建立 Resend 客戶端
const resend = new Resend(process.env.RESEND_API_KEY);

// 建立 Supabase Admin 客戶端 (用來查 Email)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 1. 發送「新報價」通知 (給買家)
export async function sendOfferNotification(wishTitle: string, buyerId: string, price: number) {
  try {
    const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(buyerId);
    if (!user || !user.email) return;

    await resend.emails.send({
      from: 'BangBuy <onboarding@resend.dev>',
      to: user.email,
      subject: `[BangBuy] 您的許願單「${wishTitle}」有新報價！`,
      html: `
        <h1>🎉 有人願意接單！</h1>
        <p>您的許願商品 <strong>${wishTitle}</strong> 收到了一個新的報價。</p>
        <p><strong>報價金額：</strong> $${price}</p>
        <p>快回到 BangBuy 會員中心確認吧！</p>
        <a href="https://bangbuy.vercel.app/dashboard" style="background:#2563EB;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">前往查看</a>
      `
    });
    console.log('報價通知信已發送');
  } catch (error) {
    console.error('發信失敗:', error);
  }
}

// 2. 👇 這是您缺少的函式：發送「新訊息」通知 (給接收者)
export async function sendMessageNotification(receiverId: string, senderName: string, content: string) {
  try {
    const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(receiverId);
    if (!user || !user.email) return;

    await resend.emails.send({
      from: 'BangBuy <onboarding@resend.dev>',
      to: user.email,
      subject: `[BangBuy] ${senderName} 傳送了一則新訊息給您`,
      html: `
        <p><strong>${senderName}</strong> 說：</p>
        <blockquote style="border-left: 4px solid #ddd; padding-left: 10px; color: #555;">${content}</blockquote>
        <br />
        <a href="https://bangbuy.vercel.app/chat" style="color:#2563EB;">回覆訊息</a>
      `
    });
    console.log('訊息通知信已發送');
  } catch (error) {
    console.error('訊息通知失敗:', error);
  }
}