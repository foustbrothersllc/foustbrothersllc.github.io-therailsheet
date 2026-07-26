import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  // Vercel Cron sends this header automatically when CRON_SECRET is set,
  // so only Vercel's own scheduler (not random internet traffic) can
  // trigger this route.
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    // A trivial, cheap query — just enough real database activity to
    // keep the Supabase project from being marked inactive/paused.
    await admin.from("profiles").select("id").limit(1);

    return NextResponse.json({ ok: true, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error("keep-alive error", err);
    return NextResponse.json({ error: "Keep-alive failed" }, { status: 500 });
  }
}
