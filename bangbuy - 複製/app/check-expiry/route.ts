import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// ============================================
// 🔐 安全初始化 Helper
// ============================================

function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[check-expiry] RESEND_API_KEY not set. Email features are disabled.');
    return null;
  }
  return new Resend(apiKey);
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.warn('[check-expiry] Missing Supabase credentials');
    return null;
  }
  return createClient(url, key);
}

// ============================================
// 📧 到期提醒 API（Cron Job）
// ============================================

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ 
        success: false, 
        message: 'Supabase not configured' 
      }, { status: 500 });
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    const { data: wishes, error } = await supabase
      .from('wish_requests')
      .select('title, buyer_id')
      .eq('status', 'open')
      .eq('deadline', dateStr);

    if (error) {
      console.error('[check-expiry] Database error:', error);
      return NextResponse.json({ 
        success: false, 
        message: 'Database error' 
      }, { status: 500 });
    }

    if (!wishes || wishes.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No expiring wishes found',
        count: 0 
      });
    }

    // 🔐 安全獲取 Resend（可選功能）
    const resend = getResend();
    if (!resend) {
      console.log('[check-expiry] Email disabled, skipping notifications');
      return NextResponse.json({ 
        success: true, 
        message: 'Found wishes but email is disabled',
        count: wishes.length,
        emailSent: 0
      });
    }

    let emailsSent = 0;

    for (const wish of wishes) {
      try {
        const { data: { user } } = await supabase.auth.admin.getUserById(wish.buyer_id);
        if (user?.email) {
          await resend.emails.send({
            from: 'BangBuy <onboarding@resend.dev>',
            to: user.email,
            subject: `[提醒] 您的許願單「${wish.title}」即將到期`,
            html: `<p>您的許願單即將在明天到期，如果還沒徵到人，建議您可以延長時間或提高預算喔！</p>`
          });
          emailsSent++;
        }
      } catch (emailError) {
        // 🔐 Email 失敗不中斷迴圈，繼續處理其他 wishes
        console.warn('[check-expiry] Email failed for wish:', wish.title, emailError);
      }
    }

    return NextResponse.json({ 
      success: true, 
      count: wishes.length,
      emailSent: emailsSent
    });
  } catch (error) {
    console.error('[check-expiry] Unexpected error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Unexpected error' 
    }, { status: 500 });
  }
}
