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

    // Generate recovery link using the correct Supabase method
    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email: targetProfile.email,
      options: {
        redirectTo: "https://railsheet.foustbrothersllc.com/reset-password",
      },
    });

    if (error) {
      console.error("generateLink error:", error);
      return NextResponse.json({ 
        error: error.message || "Failed to generate link" 
      }, { status: 500 });
    }

    console.log("generateLink response:", JSON.stringify(data, null, 2));

    // Extract the action_link from properties
    const recoveryLink = data?.properties?.action_link;
    
    if (!recoveryLink) {
      console.error("Could not extract action_link from response:", data);
      return NextResponse.json({ 
        error: "Failed to generate recovery link" 
      }, { status: 500 });
    }

    return NextResponse.json({ link: recoveryLink });
  } catch (err) {
    console.error("send-password-reset error:", err);
    return NextResponse.json(
      { error: `Failed to generate reset link: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }
}
