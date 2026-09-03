import { createClient } from "@/lib/supabase/client";
import { Trailer } from "@/lib/types";
import { compareEquipmentNumbers } from "@/lib/utils";
import { useEffect, useState, useRef } from "react";

// Treated identically to is_cold everywhere a trailer is filtered/sorted: hidden
// from drivers, grouped into the same Cold bucket. is_wrong_dest is auto-set by
// the database when a trailer is first created (see supabase_migration_wrong_dest.sql)
// and never touched again automatically, so once it's cleared it stays cleared.
const isHiddenLikeCold = (t: Trailer) => t.is_cold || t.is_wrong_dest;

let globalSubscription: any = null;
let globalTrailers: Trailer[] = [];
let globalAtRail: Trailer[] = [];
let globalCold: Trailer[] = [];
let globalDeparted: Trailer[] = [];
let isLoading = false;
let debounceRef: NodeJS.Timeout | null = null;

export function useTrailers(hideColdfromDrivers = true) {
  const supabase = createClient();
  const [atRail, setAtRail] = useState<Trailer[]>(globalAtRail);
  const [cold, setCold] = useState<Trailer[]>(globalCold);
  const [departed, setDeparted] = useState<Trailer[]>(globalDeparted);
  const [loading, setLoading] = useState(isLoading);

  useEffect(() => {
    if (!globalSubscription && globalAtRail.length === 0) {
      loadTrailersOnce();
    } else {
      setAtRail(globalAtRail);
      setCold(globalCold);
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

      // Separate cold from at_rail
      const atRailList = trailers
        .filter((t) => t.status === "at_rail" && !isHiddenLikeCold(t))
        .sort((a, b) => {
          if (a.is_hot !== b.is_hot) return a.is_hot ? -1 : 1;
          return compareEquipmentNumbers(a.equipment_number, b.equipment_number);
        });

      const coldList = trailers
        .filter((t) => isHiddenLikeCold(t) && t.status === "at_rail")
        .sort((a, b) => compareEquipmentNumbers(a.equipment_number, b.equipment_number));

      const departedList = trailers
        .filter((t) => t.status === "departed" && !isHiddenLikeCold(t))
        .sort((a, b) => compareEquipmentNumbers(a.equipment_number, b.equipment_number));

      globalAtRail = atRailList;
      globalCold = coldList;
      globalDeparted = departedList;

      setAtRail(atRailList);
      setCold(hideColdfromDrivers ? [] : coldList);
      setDeparted(departedList);
    }

    isLoading = false;
    setLoading(false);

    subscribeToChanges();
  }

  function subscribeToChanges() {
    if (globalSubscription) return;

    const channel = supabase
      .channel("trailer-changes-v3")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trailers",
        },
        async (payload) => {
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
      const newAtRail = trailers
        .filter((t) => t.status === "at_rail" && !isHiddenLikeCold(t))
        .sort((a, b) => {
          if (a.is_hot !== b.is_hot) return a.is_hot ? -1 : 1;
          return compareEquipmentNumbers(a.equipment_number, b.equipment_number);
        });

      const newCold = trailers
        .filter((t) => isHiddenLikeCold(t) && t.status === "at_rail")
        .sort((a, b) => compareEquipmentNumbers(a.equipment_number, b.equipment_number));

      const newDeparted = trailers
        .filter((t) => t.status === "departed" && !isHiddenLikeCold(t))
        .sort((a, b) => compareEquipmentNumbers(a.equipment_number, b.equipment_number));

      if (JSON.stringify(newAtRail) !== JSON.stringify(globalAtRail)) {
        globalAtRail = newAtRail;
        setAtRail(newAtRail);
      }

      if (JSON.stringify(newCold) !== JSON.stringify(globalCold)) {
        globalCold = newCold;
        setCold(hideColdfromDrivers ? [] : newCold);
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

  return { atRail, cold, departed, loading, refresh };
}
