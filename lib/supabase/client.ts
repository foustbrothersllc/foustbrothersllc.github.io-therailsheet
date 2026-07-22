import { createBrowserClient } from "@supabase/ssr";

/**
 * Client-side Supabase instance. Safe to import in any "use client" component.
 * Uses the public anon key — RLS policies (see supabase/schema.sql) are what
 * actually protect the data, not this key.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
