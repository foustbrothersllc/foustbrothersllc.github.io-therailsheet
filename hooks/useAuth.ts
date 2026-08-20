"use client";
import { createClient } from "@/lib/supabase/client";
import { Profile } from "@/lib/types";
import { useEffect, useState } from "react";

export function useAuth() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (mounted) {
          setProfile(null);
          setLoading(false);
        }
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (mounted) {
        setProfile(data as Profile | null);
        setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return { profile, loading, signOut };
}
