import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Generates a 6-digit reset code for a user.
 * Only admins can call this.
 * POST /api/generate-reset-code
 * Body: { userId: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();

    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "Missing userId." }, { status: 400 });
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }

    const admin = createAdminClient();

    // Verify caller is admin
    const { data: callerProfile } = await admin
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!callerProfile?.is_admin) {
      return NextResponse.json({ error: "Not authorized." }, { status: 403 });
    }

    // Generate random 6-digit code
    const code = String(Math.floor(Math.random() * 1000000)).padStart(6, "0");

    // Insert into reset_codes table
    const { data, error } = await admin
      .from("reset_codes")
      .insert({
        user_id: userId,
        code,
        created_by_admin_id: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("reset code error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ code, expiresAt: data.expires_at });
  } catch (err) {
    console.error("generate-reset-code error", err);
    return NextResponse.json({ error: "Failed to generate code." }, { status: 500 });
  }
}
