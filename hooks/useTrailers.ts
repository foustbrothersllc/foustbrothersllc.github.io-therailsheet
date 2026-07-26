"use client";

import { createClient } from "@/lib/supabase/client";
import { Trailer } from "@/lib/types";
import { compareEquipmentNumbers } from "@/lib/utils";
import { useCallback, useEffect, useState } from "react";

/**
 * Loads all trailers once, then keeps them in sync in real time via
 * Supabase Realtime (postgres_changes). Every logged-in tab/device sees
 * inserts, updates, and deletes instantly without a manual refresh.
 */
export function useTrailers() {
  const supabase = createClient();
  const [trailers, setTrailers] = useState<Trailer[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    refresh();

    const channel = supabase
      .channel("trailers-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trailers" },
        (payload) => {
          console.log("[trailers-realtime] event received:", payload.eventType, payload);
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
      .subscribe((status) => {
        console.log("[trailers-realtime] subscription status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh]);

  const atRail = trailers
    .filter((t) => t.status === "at_rail")
    .sort((a, b) => compareEquipmentNumbers(a.equipment_number, b.equipment_number));

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
