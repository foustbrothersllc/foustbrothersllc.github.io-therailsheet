import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Verifies a 6-digit reset code and marks it as used.
 * POST /api/verify-reset-code
 * Body: { code: string }
 * Returns: { valid: boolean, expiresAt?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json();

    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Missing code." }, { status: 400 });
    }

    const admin = createAdminClient();

    // Find the reset code
    const { data, error } = await admin
      .from("reset_codes")
      .select("*")
      .eq("code", code.trim())
      .single();

    if (error || !data) {
      return NextResponse.json({ valid: false }, { status: 200 });
    }

    // Check if expired
    const now = new Date();
    const expiresAt = new Date(data.expires_at);
    if (now > expiresAt) {
      return NextResponse.json({ valid: false }, { status: 200 });
    }

    // Check if already used
    if (data.used_at) {
      return NextResponse.json({ valid: false }, { status: 200 });
    }

    // Mark as used
    await admin
      .from("reset_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("id", data.id);

    return NextResponse.json({
      valid: true,
      userId: data.user_id,
    });
  } catch (err) {
    console.error("verify-reset-code error", err);
    return NextResponse.json({ error: "Failed to verify code." }, { status: 500 });
  }
}
