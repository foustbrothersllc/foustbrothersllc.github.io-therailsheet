import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();

    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "Missing userId." }, { status: 400 });
    }

    // Verify caller is admin
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

    // Get target user's email
    const { data: targetProfile } = await admin
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .single();

    if (!targetProfile) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    // Generate recovery link
    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email: targetProfile.email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "https://railsheet.foustbrothersllc.com"}/reset-password`,
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ link: data.properties.recovery_link });
  } catch (err) {
    console.error("send-password-reset error", err);
    return NextResponse.json(
      { error: "Failed to generate reset link." },
      { status: 500 }
    );
  }
}
