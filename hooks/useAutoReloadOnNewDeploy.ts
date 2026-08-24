"use client";
import { useEffect } from "react";

/**
 * Disabled - was causing random page reloads every 60 seconds.
 * Real-time updates from Supabase (trailers, presence, profiles) work independently.
 * Manual page refresh (F5) is used when needed after deployments.
 */
export function useAutoReloadOnNewDeploy() {
  useEffect(() => {
    // No-op - auto-reload on deploy checks removed
  }, []);
}
