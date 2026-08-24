import { createClient } from "@/lib/supabase/client";
import { Trailer } from "@/lib/types";
import { compareEquipmentNumbers } from "@/lib/utils";
import { useEffect, useState, useRef } from "react";

let globalSubscription: any = null;
let globalTrailers: Trailer[] = [];
let globalAtRail: Trailer[] = [];
let globalDeparted: Trailer[] = [];
let isLoading = false;
let debounceRef: NodeJS.Timeout | null = null;

export function useTrailers() {
  const supabase = createClient();
  const [atRail, setAtRail] = useState<Trailer[]>(globalAtRail);
  const [departed, setDeparted] = useState<Trailer[]>(globalDeparted);
  const [loading, setLoading] = useState(isLoading);

  // Load trailers ONCE globally
  useEffect(() => {
    if (!globalSubscription && globalAtRail.length === 0) {
      loadTrailersOnce();
    } else {
      // Update local state with global data
      setAtRail(globalAtRail);
      setDeparted(globalDeparted);
      setLoading(false);
    }
  }, []);

  async function loadTrailersOnce() {
    if (isLoading) return;
    isLoading = true;
    setLoading(true);

    const { data: trailers } = await supabase
      .from("trailers")
      .select("*");

    if (trailers) {
      globalTrailers = trailers;
      
      // Filter and SORT by equipment number
      const atRailList = trailers
        .filter((t) => t.status === "at_rail")
        .sort((a, b) => {
          if (a.is_hot !== b.is_hot) return a.is_hot ? -1 : 1;
          return compareEquipmentNumbers(a.equipment_number, b.equipment_number);
        });
      
      const departedList = trailers
        .filter((t) => t.status === "departed")
        .sort((a, b) => compareEquipmentNumbers(a.equipment_number, b.equipment_number));
      
      globalAtRail = atRailList;
      globalDeparted = departedList;
      
      setAtRail(atRailList);
      setDeparted(departedList);
    }

    isLoading = false;
    setLoading(false);
    
    subscribeToChanges();
  }

  function subscribeToChanges() {
    if (globalSubscription) return;

    const channel = supabase
      .channel("trailer-changes-v2")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trailers",
        },
        async (payload) => {
          // Heavy debounce - wait 500ms before updating
          if (debounceRef) clearTimeout(debounceRef);
          
          debounceRef = setTimeout(async () => {
            await reloadTrailers();
          }, 500);
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("Subscribed to trailer changes");
        }
      });

    globalSubscription = channel;
  }

  async function reloadTrailers() {
    const { data: trailers } = await supabase
      .from("trailers")
      .select("*");

    if (trailers) {
      // Filter and SORT by equipment number
      const newAtRail = trailers
        .filter((t) => t.status === "at_rail")
        .sort((a, b) => {
          if (a.is_hot !== b.is_hot) return a.is_hot ? -1 : 1;
          return compareEquipmentNumbers(a.equipment_number, b.equipment_number);
        });
      
      const newDeparted = trailers
        .filter((t) => t.status === "departed")
        .sort((a, b) => compareEquipmentNumbers(a.equipment_number, b.equipment_number));

      // Only update if data actually changed
      if (JSON.stringify(newAtRail) !== JSON.stringify(globalAtRail)) {
        globalAtRail = newAtRail;
        setAtRail(newAtRail);
      }
      
      if (JSON.stringify(newDeparted) !== JSON.stringify(globalDeparted)) {
        globalDeparted = newDeparted;
        setDeparted(newDeparted);
      }
    }
  }

  async function refresh() {
    if (debounceRef) clearTimeout(debounceRef);
    await reloadTrailers();
  }

  return { atRail, departed, loading, refresh };
}
