"use client";

import { AddTrailerModal } from "@/components/AddTrailerModal";
import { AdminTrailerCard } from "@/components/AdminTrailerCard";
import { ConfirmModal } from "@/components/ConfirmModal";
import { CsvImportModal } from "@/components/CsvImportModal";
import { EditTrailerModal } from "@/components/EditTrailerModal";
import { FlagTrailerModal } from "@/components/FlagTrailerModal";
import { PullToRefresh } from "@/components/PullToRefresh";
import { UserSidebar } from "@/components/UserSidebar";
import { PasteCSVModal } from "@/components/PasteCSVModal";
import { AdminTrailerDetailModal } from "@/components/AdminTrailerDetailModal";
import { useAuth } from "@/hooks/useAuth";
import { useAutoReloadOnNewDeploy } from "@/hooks/useAutoReloadOnNewDeploy";
import { useTrailers } from "@/hooks/useTrailers";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Profile, Trailer } from "@/lib/types";
import { LogOut, Plus, RefreshCw, Search, Upload, X, FileText, Snowflake } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface AdminDashboardClientProps {
  initialProfile: Profile;
}

export function AdminDashboardClient({ initialProfile }: AdminDashboardClientProps) {
  const supabase = createClient();
  const { profile: liveProfile, signOut } = useAuth();
  const profile = liveProfile ?? initialProfile;
  useAutoReloadOnNewDeploy();
  const { atRail, cold, departed, refresh } = useTrailers(false);

  const [editing, setEditing] = useState<Trailer | null>(null);
  const [flagging, setFlagging] = useState<Trailer | null>(null);
  const [deleting, setDeleting] = useState<Trailer | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showPasteCSV, setShowPasteCSV] = useState(false);
  const [selectedTrailerDetail, setSelectedTrailerDetail] = useState<Trailer | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const matches = (t: Trailer) =>
    query.trim() === "" || t.equipment_number.includes(query.trim().toUpperCase());

  const filteredAtRail = atRail.filter(matches);
  const filteredCold = cold.filter(matches);
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
        is_cold: false,
      })
      .eq("id", trailer.id);
  }

  async function handleMarkDeparted(trailer: Trailer) {
    await supabase
      .from("trailers")
      .update({
        status: "departed",
        assigned_to_id: null,
        assigned_driver_name: null,
        assigned_driver_emp_id: null,
        is_cold: false,
      })
      .eq("id", trailer.id)
      .eq("status", "at_rail");
  }

  async function handleToggleHot(trailer: Trailer) {
    const newHotStatus = !trailer.is_hot;
    
    await supabase
      .from("trailers")
      .update({ is_hot: newHotStatus })
      .eq("id", trailer.id);

    // After toggling hot OFF, check if cold should auto-remove
    if (trailer.is_hot === true) {
      await new Promise(resolve => setTimeout(resolve, 300));
      await autoRemoveColdIfOnlyFlag(trailer.id);
    }
  }

  async function handleToggleCold(trailer: Trailer) {
    const newColdStatus = !trailer.is_cold;
    
    await supabase
      .from("trailers")
      .update({ is_cold: newColdStatus })
      .eq("id", trailer.id);

    // After toggling cold ON, check if it should auto-remove
    if (newColdStatus === true) {
      await new Promise(resolve => setTimeout(resolve, 300));
      await autoRemoveColdIfOnlyFlag(trailer.id);
    }
  }

  async function autoRemoveColdIfOnlyFlag(trailerId: string) {
    const { data: trailer } = await supabase
      .from("trailers")
      .select("is_cold, is_hot, flag_note")
      .eq("id", trailerId)
      .single();

    if (!trailer) return;

    // If cold is ON, check if there are OTHER flags
    if (trailer.is_cold) {
      const hasHot = trailer.is_hot === true;
      const hasRedtag = trailer.flag_note && trailer.flag_note.trim().length > 0;

      // If ONLY cold is set (no hot, no redtag), remove cold
      if (!hasHot && !hasRedtag) {
        await supabase
          .from("trailers")
          .update({ is_cold: false })
          .eq("id", trailerId);
      }
    }
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
        <div className="flex-1 lg:flex-[7] min-h-0 flex flex-col px-6 pt-6 pb-4">
          <div className="flex flex-wrap items-center gap-2 mb-5">
            <button
              onClick={() => setShowAddModal(true)}
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
              onClick={() => setShowPasteCSV(true)}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-card bg-yard-panel border border-yard-border text-sm text-yard-text hover:border-yard-borderLight"
            >
              <FileText size={15} /> Paste CSV
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
                className="w-full h-9 pl-9 pr-9 rounded-card bg-yard-panel border border-yard-border text-sm outline-none focus:border-amber"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-yard-faint hover:text-yard-text"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-6">
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <span className="h-2 w-2 rounded-full bg-amber" />
                <h2 className="font-display text-sm uppercase tracking-widest text-yard-muted">
                  At Rail
                </h2>
                <span className="text-xs text-yard-faint">{filteredAtRail.length}</span>
              </div>
              <PullToRefresh onRefresh={refresh} className="flex-1 space-y-2.5 pb-4 min-h-0 overflow-y-auto">
                {filteredAtRail.length === 0 && filteredCold.length === 0 && (
                  <p className="text-sm text-yard-faint px-1 py-8 text-center">Nothing here.</p>
                )}
                {filteredAtRail.map((t) => (
                  <AdminTrailerCard
                    key={t.id}
                    trailer={t}
                    onRevert={() => handleRevert(t)}
                    onEdit={() => setEditing(t)}
                    onFlag={() => setFlagging(t)}
                    onToggleHot={() => handleToggleHot(t)}
                    onToggleCold={() => handleToggleCold(t)}
                    onMarkDeparted={() => handleMarkDeparted(t)}
                    onDelete={() => setDeleting(t)}
                    onViewDetails={() => setSelectedTrailerDetail(t)}
                  />
                ))}

                {filteredCold.length > 0 && (
                  <>
                    <div className="flex items-center gap-2 mt-6 pt-6 border-t border-yard-border">
                      <Snowflake size={14} className="text-depart" />
                      <h3 className="font-display text-xs uppercase tracking-widest text-yard-muted">
                        Cold ({filteredCold.length})
                      </h3>
                    </div>
                    {filteredCold.map((t) => (
                      <AdminTrailerCard
                        key={t.id}
                        trailer={t}
                        onRevert={() => handleRevert(t)}
                        onEdit={() => setEditing(t)}
                        onFlag={() => setFlagging(t)}
                        onToggleHot={() => handleToggleHot(t)}
                        onToggleCold={() => handleToggleCold(t)}
                        onMarkDeparted={() => handleMarkDeparted(t)}
                        onDelete={() => setDeleting(t)}
                        onViewDetails={() => setSelectedTrailerDetail(t)}
                      />
                    ))}
                  </>
                )}
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
              <PullToRefresh onRefresh={refresh} className="flex-1 space-y-2.5 pb-4 min-h-0 overflow-y-auto">
                {filteredDeparted.length === 0 && (
                  <p className="text-sm text-yard-faint px-1 py-8 text-center">Nothing here.</p>
                )}
                {filteredDeparted.map((t) => (
                  <AdminTrailerCard
                    key={t.id}
                    trailer={t}
                    onRevert={() => handleRevert(t)}
                    onEdit={() => setEditing(t)}
                    onFlag={() => setFlagging(t)}
                    onToggleHot={() => handleToggleHot(t)}
                    onToggleCold={() => handleToggleCold(t)}
                    onMarkDeparted={() => handleMarkDeparted(t)}
                    onDelete={() => setDeleting(t)}
                    onViewDetails={() => setSelectedTrailerDetail(t)}
                  />
                ))}
              </PullToRefresh>
            </div>
          </div>
        </div>

        <div className="lg:flex-[3] min-h-0">
          <UserSidebar currentProfile={profile} />
        </div>
      </div>

      <AddTrailerModal open={showAddModal} onClose={() => setShowAddModal(false)} />
      <EditTrailerModal trailer={editing} onClose={() => setEditing(null)} />
      <FlagTrailerModal trailer={flagging} onClose={() => setFlagging(null)} />
      <CsvImportModal open={showImport} onClose={() => setShowImport(false)} />
      <PasteCSVModal open={showPasteCSV} onClose={() => setShowPasteCSV(false)} />
      <AdminTrailerDetailModal
        trailer={selectedTrailerDetail}
        profile={profile}
        onClose={() => setSelectedTrailerDetail(null)}
      />
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
