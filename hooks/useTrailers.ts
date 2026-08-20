import { createClient } from "@/lib/supabase/client";
import { Trailer } from "@/lib/types";
import { useEffect, useState, useRef } from "react";

export function useTrailers() {
  const supabase = createClient();
  const [atRail, setAtRail] = useState<Trailer[]>([]);
  const [departed, setDeparted] = useState<Trailer[]>([]);
  const [loading, setLoading] = useState(true);
  const subscriptionRef = useRef<any>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastDataRef = useRef<string>("");

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
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  async function loadTrailers() {
    const { data: trailers } = await supabase
      .from("trailers")
      .select("*")
      .order("created_at", { ascending: false });

    if (trailers) {
      // Only update state if data actually changed
      const dataString = JSON.stringify(trailers);
      if (dataString !== lastDataRef.current) {
        lastDataRef.current = dataString;
        
        const atRailList = trailers.filter((t) => t.status === "at_rail");
        const departedList = trailers.filter((t) => t.status === "departed");
        setAtRail(atRailList);
        setDeparted(departedList);
      }
    }
    setLoading(false);
  }

  function subscribeToChanges() {
    const channel = supabase
      .channel("trailer-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trailers",
        },
        async (payload) => {
          // Debounce rapid-fire updates
          if (debounceRef.current) {
            clearTimeout(debounceRef.current);
          }
          
          debounceRef.current = setTimeout(async () => {
            await loadTrailers();
          }, 300); // Wait 300ms before updating to batch changes
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
