import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const PROTECTED_EMAIL = "foustbrothersllc@gmail.com";

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

    const { data: callerProfile } = await admin
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!callerProfile?.is_admin) {
      return NextResponse.json({ error: "Not authorized." }, { status: 403 });
    }

    if (userId === user.id) {
      return NextResponse.json(
        { error: "You can't delete your own account." },
        { status: 400 }
      );
    }

    const { data: targetProfile } = await admin
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .single();

    if (targetProfile?.email?.toLowerCase() === PROTECTED_EMAIL) {
      return NextResponse.json(
        { error: "This account cannot be deleted." },
        { status: 403 }
      );
    }

    const { error } = await admin.auth.admin.deleteUser(userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("delete-user error", err);
    return NextResponse.json({ error: "Failed to delete user." }, { status: 500 });
  }
}
