'use server';

import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const resend = new Resend(process.env.RESEND_API_KEY);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function sendOfferNotification(wishTitle: string, buyerId: string, price: number) {
  try {
    const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(buyerId);
    if (!user?.email) return;

    await resend.emails.send({
      from: 'BangBuy <onboarding@resend.dev>',
      to: user.email,
      subject: `[BangBuy] 你收到新的報價：${wishTitle}`,
      html: `
        <h1>有代購想接單</h1>
        <p>你的需求 <strong>${wishTitle}</strong> 收到新的報價。</p>
        <p><strong>報價金額：</strong> $${price}</p>
        <p>前往 BangBuy 查看詳細內容。</p>
        <a href="https://bangbuy.vercel.app/dashboard" style="background:#2563EB;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">查看訂單</a>
      `,
    });
    console.log('報價通知已寄出');
  } catch (error) {
    console.error('報價通知失敗:', error);
  }
}

export async function sendMessageNotification(receiverId: string, senderName: string, content: string) {
  try {
    const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(receiverId);
    if (!user?.email) return;

    await resend.emails.send({
      from: 'BangBuy <onboarding@resend.dev>',
      to: user.email,
      subject: `[BangBuy] ${senderName} 傳送了一則新訊息`,
      html: `
        <p><strong>${senderName}</strong> 傳來新訊息：</p>
        <blockquote style="border-left: 4px solid #ddd; padding-left: 10px; color: #555;">${content}</blockquote>
        <br />
        <a href="https://bangbuy.vercel.app/chat" style="color:#2563EB;">立即前往查看</a>
      `,
    });
    console.log('訊息通知已寄出');
  } catch (error) {
    console.error('訊息通知失敗:', error);
  }
}
