import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  await fetch(
    `${process.env.SUPABASE_URL}/functions/v1/email-worker`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
    }
  );

  return NextResponse.json({ ok: true });
}
