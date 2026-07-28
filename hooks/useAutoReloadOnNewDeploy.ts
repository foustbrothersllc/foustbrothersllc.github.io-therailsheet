"use client";

import { useEffect } from "react";

const CHECK_INTERVAL_MS = 60000;

/**
 * Every deploy bakes a fresh NEXT_PUBLIC_BUILD_ID into the client bundle.
 * This periodically asks the server (running whatever deployment is
 * currently live) what its build ID is, and if it's different from the
 * one this tab loaded with, forces a hard reload — so a tab left open
 * across a deploy self-heals instead of silently running stale code
 * until someone manually clears their cache.
 */
export function useAutoReloadOnNewDeploy() {
  useEffect(() => {
    const currentBuildId = process.env.NEXT_PUBLIC_BUILD_ID;

    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/build-info", { cache: "no-store" });
        const data = await res.json();
        if (data.buildId && currentBuildId && data.buildId !== currentBuildId) {
          window.location.reload();
        }
      } catch {
        // Network hiccup — just try again next interval, no need to react.
      }
    }, CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);
}
