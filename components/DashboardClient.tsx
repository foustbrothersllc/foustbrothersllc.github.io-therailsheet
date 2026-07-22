"use client";

import { NavShield } from "@/components/NavShield";
import { TrailerCard } from "@/components/TrailerCard";
import { TrailerDetailModal } from "@/components/TrailerDetailModal";
import { useAuth } from "@/hooks/useAuth";
import { useTrailers } from "@/hooks/useTrailers";
import { cn } from "@/lib/utils";
import { Profile, Trailer } from "@/lib/types";
import { LogOut } from "lucide-react";
import { useState } from "react";

interface DashboardClientProps {
  initialProfile: Profile;
}

export function DashboardClient({ initialProfile }: DashboardClientProps) {
  const { profile: liveProfile, signOut } = useAuth();
  const profile = liveProfile ?? initialProfile;
  const { atRail, departed, loading } = useTrailers();
  const [tab, setTab] = useState<"at_rail" | "departed">("at_rail");
  const [selected, setSelected] = useState<Trailer | null>(null);

  const Column = ({
    title,
    trailers,
    accent,
  }: {
    title: string;
    trailers: Trailer[];
    accent: string;
  }) => (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex items-center gap-2 px-1 mb-3">
        <span className={cn("h-2 w-2 rounded-full", accent)} />
        <h2 className="font-display text-sm uppercase tracking-widest text-yard-muted">
          {title}
        </h2>
        <span className="text-xs text-yard-faint">{trailers.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-hidden space-y-2.5 pb-6">
        {trailers.length === 0 && (
          <p className="text-sm text-yard-faint px-1 py-8 text-center">Nothing here.</p>
        )}
        {trailers.map((t) => (
          <TrailerCard key={t.id} trailer={t} onClick={() => setSelected(t)} />
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-4 sm:px-6 h-16 border-b border-yard-border shrink-0">
        <div className="flex items-center gap-2">
          <span className="h-2 w-6 bg-amber rounded-full" />
          <span className="font-stencil text-xs tracking-[0.25em] text-yard-muted uppercase">
            Rail Sheet
          </span>
        </div>
        <div className="flex items-center gap-1">
          {profile.is_admin && <NavShield />}
          <button
            onClick={signOut}
            aria-label="Sign out"
            className="h-10 w-10 flex items-center justify-center rounded-full text-yard-muted hover:text-yard-text hover:bg-yard-panel"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Mobile top-tabs */}
      <div className="sm:hidden flex px-4 pt-4 gap-2 shrink-0">
        {(["at_rail", "departed"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 h-11 rounded-card font-display text-sm uppercase tracking-wide transition-colors",
              tab === t
                ? "bg-amber text-yard-bg"
                : "bg-yard-panel text-yard-muted border border-yard-border"
            )}
          >
            {t === "at_rail" ? "At Rail" : "Departed"}
          </button>
        ))}
      </div>

      <main className="flex-1 min-h-0 px-4 sm:px-6 pt-4 sm:pt-6 pb-4 flex flex-col sm:flex-row sm:gap-8">
        {loading ? (
          <p className="text-yard-faint text-sm px-1 py-8">Loading yard board…</p>
        ) : (
          <>
            <div className={cn("sm:flex-1 sm:flex sm:min-h-0", tab === "at_rail" ? "flex flex-1 min-h-0" : "hidden")}>
              <Column title="At Rail" trailers={atRail} accent="bg-amber" />
            </div>
            <div className={cn("sm:flex-1 sm:flex sm:min-h-0", tab === "departed" ? "flex flex-1 min-h-0" : "hidden")}>
              <Column title="Departed" trailers={departed} accent="bg-depart" />
            </div>
          </>
        )}
      </main>

      <TrailerDetailModal trailer={selected} profile={profile} onClose={() => setSelected(null)} />
    </div>
  );
}
