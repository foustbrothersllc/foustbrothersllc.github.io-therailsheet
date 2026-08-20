import { createClient } from "@/lib/supabase/client";
import { Trailer } from "@/lib/types";
import { useEffect, useState } from "react";

export function useTrailers() {
  const supabase = createClient();
  const [atRail, setAtRail] = useState<Trailer[]>([]);
  const [departed, setDeparted] = useState<Trailer[]>([]);
  const [loading, setLoading] = useState(true);

  // Load trailers once on mount
  useEffect(() => {
    loadTrailers();
  }, []);

  async function loadTrailers() {
    setLoading(true);
    const { data: trailers } = await supabase
      .from("trailers")
      .select("*")
      .order("created_at", { ascending: false });

    if (trailers) {
      const atRailList = trailers.filter((t) => t.status === "at_rail");
      const departedList = trailers.filter((t) => t.status === "departed");
      setAtRail(atRailList);
      setDeparted(departedList);
    }
    setLoading(false);
  }

  // Only subscribe to changes, NO polling
  useEffect(() => {
    const channel = supabase
      .channel("trailers_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trailers" },
        async () => {
          // When data changes, reload only the affected data
          await loadTrailers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function refresh() {
    await loadTrailers();
  }

  return { atRail, departed, loading, refresh };
}
