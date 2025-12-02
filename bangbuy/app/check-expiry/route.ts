import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export async function GET() {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().split('T')[0];

  const { data: wishes } = await supabase
    .from('wish_requests')
    .select('title, buyer_id')
    .eq('status', 'open')
    .eq('deadline', dateStr);

  if (!wishes || wishes.length === 0) {
    return NextResponse.json({ message: 'No expiring wishes found' });
  }

  for (const wish of wishes) {
    const { data: { user } } = await supabase.auth.admin.getUserById(wish.buyer_id);
    if (user?.email) {
      await resend.emails.send({
        from: 'BangBuy <onboarding@resend.dev>',
        to: user.email,
        subject: `[提醒] 您的許願單「${wish.title}」即將到期`,
        html: `<p>您的許願單即將在明天到期，如果還沒徵到人，建議您可以延長時間或提高預算喔！</p>`
      });
    }
  }

  return NextResponse.json({ success: true, count: wishes.length });
}