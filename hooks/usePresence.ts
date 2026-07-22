"use client";

import { createClient } from "@/lib/supabase/client";
import { Profile } from "@/lib/types";
import { useEffect, useState } from "react";

/**
 * Joins a shared Supabase Presence channel and tracks the current user's
 * heartbeat. Returns a Set of user_ids that are currently online, which
 * the admin Users sidebar uses to render the pulsing "Active Now" dot.
 */
export function usePresence(profile: Profile | null) {
  const supabase = createClient();
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!profile) return;

    const channel = supabase.channel("rail-sheet-presence", {
      config: { presence: { key: profile.id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setOnlineIds(new Set(Object.keys(state)));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_id: profile.id,
            first_name: profile.first_name,
            last_name: profile.last_name,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  return onlineIds;
}
