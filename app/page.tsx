import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function RootPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("is_approved")
    .eq("id", user.id)
    .single();

  if (!profile?.is_approved) {
    redirect("/pending");
  }

  redirect("/dashboard");
}
