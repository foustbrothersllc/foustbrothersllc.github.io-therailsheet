"use client";

import { AddTrailerForm } from "@/components/AddTrailerForm";
import { AdminTrailerCard } from "@/components/AdminTrailerCard";
import { ConfirmModal } from "@/components/ConfirmModal";
import { CsvImportModal } from "@/components/CsvImportModal";
import { EditTrailerModal } from "@/components/EditTrailerModal";
import { PullToRefresh } from "@/components/PullToRefresh";
import { UserSidebar } from "@/components/UserSidebar";
import { useAuth } from "@/hooks/useAuth";
import { useTrailers } from "@/hooks/useTrailers";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Profile, Trailer } from "@/lib/types";
import { LogOut, Plus, RefreshCw, Search, Upload } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface AdminDashboardClientProps {
  initialProfile: Profile;
}

export function AdminDashboardClient({ initialProfile }: AdminDashboardClientProps) {
  const supabase = createClient();
  const { profile: liveProfile, signOut } = useAuth();
  const profile = liveProfile ?? initialProfile;
  const { atRail, departed, refresh } = useTrailers();

  const [editing, setEditing] = useState<Trailer | null>(null);
  const [deleting, setDeleting] = useState<Trailer | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const matches = (t: Trailer) =>
    query.trim() === "" || t.equipment_number.includes(query.trim().toUpperCase());

  const filteredAtRail = atRail.filter(matches);
  const filteredDeparted = departed.filter(matches);

  async function handleManualRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  async function handleRevert(trailer: Trailer) {
    await supabase
      .from("trailers")
      .update({
        status: "at_rail",
        assigned_to_id: null,
        assigned_driver_name: null,
        assigned_driver_emp_id: null,
      })
      .eq("id", trailer.id);
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeletingBusy(true);
    await supabase.from("trailers").delete().eq("id", deleting.id);
    setDeletingBusy(false);
    setDeleting(null);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 h-16 border-b border-yard-border shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="h-2 w-6 bg-amber rounded-full" />
            <span className="font-stencil text-xs tracking-[0.25em] text-yard-muted uppercase">
              Rail Sheet
            </span>
          </Link>
          <span className="text-xs font-semibold text-amber bg-amber/10 border border-amber/30 rounded-full px-2.5 py-1 uppercase tracking-wide">
            Admin
          </span>
        </div>
        <button
          onClick={signOut}
          aria-label="Sign out"
          className="h-10 w-10 flex items-center justify-center rounded-full text-yard-muted hover:text-yard-text hover:bg-yard-panel"
        >
          <LogOut size={18} />
        </button>
      </header>

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
        {/* Left/center: live operational view (70%) */}
        <div className="flex-1 lg:flex-[7] min-h-0 flex flex-col px-6 pt-6 pb-4">
          <div className="flex flex-wrap items-center gap-2 mb-5">
            <button
              onClick={() => setShowAddForm((v) => !v)}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-card bg-yard-panel border border-yard-border text-sm text-yard-text hover:border-yard-borderLight"
            >
              <Plus size={15} /> Add Trailer
            </button>
            <button
              onClick={() => setShowImport(true)}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-card bg-amber text-yard-bg text-sm font-semibold hover:bg-amber/90"
            >
              <Upload size={15} /> Import CSV / Excel
            </button>
            <button
              onClick={handleManualRefresh}
              title="Refresh yard board"
              aria-label="Refresh yard board"
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-card bg-yard-panel border border-yard-border text-sm text-yard-text hover:border-yard-borderLight"
            >
              <RefreshCw size={15} className={cn(refreshing && "animate-spin")} />
              Refresh
            </button>
            <div className="relative flex-1 min-w-[180px] max-w-sm ml-auto">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-yard-faint pointer-events-none"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search equipment number"
                className="w-full h-9 pl-9 pr-3 rounded-card bg-yard-panel border border-yard-border text-sm outline-none focus:border-amber"
              />
            </div>
          </div>

          {showAddForm && (
            <div className="mb-5 p-4 rounded-card bg-yard-panel border border-yard-border">
              <AddTrailerForm />
            </div>
          )}

          <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-6">
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <span className="h-2 w-2 rounded-full bg-amber" />
                <h2 className="font-display text-sm uppercase tracking-widest text-yard-muted">
                  At Rail
                </h2>
                <span className="text-xs text-yard-faint">{filteredAtRail.length}</span>
              </div>
              <PullToRefresh onRefresh={refresh} className="flex-1 space-y-2.5 pb-4">
                {filteredAtRail.length === 0 && (
                  <p className="text-sm text-yard-faint px-1 py-8 text-center">Nothing here.</p>
                )}
                {filteredAtRail.map((t) => (
                  <AdminTrailerCard
                    key={t.id}
                    trailer={t}
                    onRevert={() => handleRevert(t)}
                    onEdit={() => setEditing(t)}
                    onDelete={() => setDeleting(t)}
                  />
                ))}
              </PullToRefresh>
            </div>

            <div className="flex-1 min-h-0 flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <span className="h-2 w-2 rounded-full bg-depart" />
                <h2 className="font-display text-sm uppercase tracking-widest text-yard-muted">
                  Departed
                </h2>
                <span className="text-xs text-yard-faint">{filteredDeparted.length}</span>
              </div>
              <PullToRefresh onRefresh={refresh} className="flex-1 space-y-2.5 pb-4">
                {filteredDeparted.length === 0 && (
                  <p className="text-sm text-yard-faint px-1 py-8 text-center">Nothing here.</p>
                )}
                {filteredDeparted.map((t) => (
                  <AdminTrailerCard
                    key={t.id}
                    trailer={t}
                    onRevert={() => handleRevert(t)}
                    onEdit={() => setEditing(t)}
                    onDelete={() => setDeleting(t)}
                  />
                ))}
              </PullToRefresh>
            </div>
          </div>
        </div>

        {/* Right sidebar: users directory (30%) */}
        <div className="lg:flex-[3] min-h-0">
          <UserSidebar currentProfile={profile} />
        </div>
      </div>

      <EditTrailerModal trailer={editing} onClose={() => setEditing(null)} />
      <CsvImportModal open={showImport} onClose={() => setShowImport(false)} />
      <ConfirmModal
        open={!!deleting}
        title="Delete Trailer"
        message={`Remove ${deleting?.equipment_number} from active inventory? This can't be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deletingBusy}
        onCancel={() => setDeleting(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
