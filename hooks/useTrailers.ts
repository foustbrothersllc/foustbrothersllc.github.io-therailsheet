import { createClient } from "@/lib/supabase/client";
import { Trailer } from "@/lib/types";
import { useEffect, useState } from "react";

export function useTrailers() {
  const supabase = createClient();
  const [atRail, setAtRail] = useState<Trailer[]>([]);
  const [departed, setDeparted] = useState<Trailer[]>([]);
  const [loading, setLoading] = useState(true);
  const subscriptionRef = React.useRef<any>(null);

  // Load trailers ONCE on mount
  useEffect(() => {
    const loadInitial = async () => {
      await loadTrailers();
      subscribeToChanges();
    };
    
    loadInitial();

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, []);

  async function loadTrailers() {
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

  function subscribeToChanges() {
    const channel = supabase
      .channel("trailer-changes", { config: { broadcast: { self: true } } })
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trailers",
        },
        async (payload) => {
          // Only reload when actual data changes
          await loadTrailers();
        }
      )
      .subscribe();

    subscriptionRef.current = channel;
  }

  async function refresh() {
    await loadTrailers();
  }

  return { atRail, departed, loading, refresh };
}
