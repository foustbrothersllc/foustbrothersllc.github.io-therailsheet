"use client";

import { createClient } from "@/lib/supabase/client";
import { Trailer } from "@/lib/types";
import { compareEquipmentNumbers } from "@/lib/utils";
import { useCallback, useEffect, useRef, useState } from "react";

const POLL_INTERVAL_MS = 1000;

/**
 * Loads all trailers once, then keeps them in sync via Supabase Realtime
 * (postgres_changes) AND a background poll every few seconds. The poll is
 * a safety net: on some networks/devices the realtime WebSocket connects
 * successfully but silently stops delivering change events, with no error
 * to detect. Polling guarantees the screen is never more than a few
 * seconds stale, no matter what the realtime connection is doing.
 */
export function useTrailers() {
  const supabase = createClient();
  const [trailers, setTrailers] = useState<Trailer[]>([]);
  const [loading, setLoading] = useState(true);
  const trailersRef = useRef<Trailer[]>([]);
  trailersRef.current = trailers;

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from("trailers")
      .select("*")
      .order("created_at", { ascending: true });

    if (!error && data) {
      setTrailers(data as Trailer[]);
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the realtime socket's auth in sync with the current session. Access
  // tokens expire roughly every hour; without this, a tab left open a long
  // time keeps its WebSocket connected (so presence still works) but the
  // server can stop delivering postgres_changes events tied to an expired
  // token.
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) {
        supabase.realtime.setAuth(session.access_token);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) {
        supabase.realtime.setAuth(session.access_token);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    refresh();

    const channel = supabase
      .channel("trailers-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trailers" },
        (payload) => {
          setTrailers((current) => {
            if (payload.eventType === "INSERT") {
              const row = payload.new as Trailer;
              if (current.some((t) => t.id === row.id)) return current;
              return [...current, row];
            }
            if (payload.eventType === "UPDATE") {
              const row = payload.new as Trailer;
              return current.map((t) => (t.id === row.id ? row : t));
            }
            if (payload.eventType === "DELETE") {
              const row = payload.old as Trailer;
              return current.filter((t) => t.id !== row.id);
            }
            return current;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh]);

  // Background safety-net poll. Only applies changes if something actually
  // differs, so it never causes a visible flicker on a screen that's
  // already current via realtime.
  useEffect(() => {
    const interval = setInterval(async () => {
      const { data, error } = await supabase
        .from("trailers")
        .select("*")
        .order("created_at", { ascending: true });

      if (!error && data) {
        const next = data as Trailer[];
        const current = trailersRef.current;
        const changed =
          next.length !== current.length ||
          next.some((row, i) => {
            const existing = current[i];
            return !existing || existing.id !== row.id || existing.updated_at !== row.updated_at;
          });
        if (changed) {
          setTrailers(next);
        }
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const atRail = trailers
    .filter((t) => t.status === "at_rail")
    .sort((a, b) => {
      if (a.is_hot !== b.is_hot) return a.is_hot ? -1 : 1;
      return compareEquipmentNumbers(a.equipment_number, b.equipment_number);
    });

  // Departed list only shows trailers from the last 12 hours (spec: Flow B).
  const departed = trailers
    .filter((t) => {
      if (t.status !== "departed") return false;
      const hrs = (Date.now() - new Date(t.updated_at).getTime()) / (1000 * 60 * 60);
      return hrs <= 12;
    })
    .sort((a, b) => compareEquipmentNumbers(a.equipment_number, b.equipment_number));

  return { trailers, atRail, departed, loading, refresh };
}
