"use client";

import { EditUserModal } from "@/components/EditUserModal";
import { createClient } from "@/lib/supabase/client";
import { usePresence } from "@/hooks/usePresence";
import { Profile } from "@/lib/types";
import { cn, initials } from "@/lib/utils";
import { useEffect, useState, useRef } from "react";

interface UserSidebarProps {
  currentProfile: Profile;
}

const PROTECTED_EMAIL = "foustbrothersllc@gmail.com";

export function UserSidebar({ currentProfile }: UserSidebarProps) {
  const supabase = createClient();
  const [users, setUsers] = useState<Profile[]>([]);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [showAll, setShowAll] = useState(false);
  const onlineIds = usePresence(currentProfile);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastDataRef = useRef<string>("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .order("is_approved", { ascending: true })
        .order("created_at", { ascending: false });
      
      if (mounted && data) {
        // Only update if data actually changed
        const dataString = JSON.stringify(data);
        if (dataString !== lastDataRef.current) {
          lastDataRef.current = dataString;
          setUsers(data as Profile[]);
        }
      }
    }

    load();

    const channel = supabase
      .channel("profiles-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => {
          // Debounce - wait 300ms before reloading
          if (debounceRef.current) {
            clearTimeout(debounceRef.current);
          }
          
          debounceRef.current = setTimeout(() => {
            load();
          }, 300);
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pending = users.filter((u) => !u.is_approved);
  const active = users.filter((u) => u.is_approved);
  const visibleActive = showAll ? active : active.filter((u) => onlineIds.has(u.id));

  async function approve(id: string, asAdmin: boolean) {
    await supabase
      .from("profiles")
      .update({ is_approved: true, is_admin: asAdmin })
      .eq("id", id);
  }

  async function toggleAdmin(e: React.MouseEvent, id: string, current: boolean, email: string) {
    e.stopPropagation();
    if (email.toLowerCase() === PROTECTED_EMAIL) return;
    await supabase.from("profiles").update({ is_admin: !current }).eq("id", id);
  }

  return (
    <aside className="w-full lg:w-[320px] shrink-0 border-l border-yard-border flex flex-col min-h-0">
      <div className="px-4 py-3.5 border-b border-yard-border shrink-0">
        <h2 className="font-display text-sm uppercase tracking-widest text-yard-muted">Users</h2>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hidden px-3 py-3 space-y-4">
        {pending.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-wide text-amber px-1 mb-2">
              Pending Approval ({pending.length})
            </p>
            <div className="space-y-2">
              {pending.map((u) => (
                <div
                  key={u.id}
                  className="bg-amber/5 border border-amber/25 rounded-card px-3 py-2.5"
                >
                  <p className="text-sm font-medium text-yard-text truncate">
                    {u.first_name} {u.last_name}
                  </p>
                  <p className="text-xs text-yard-muted truncate">
                    {u.email} · #{u.employee_id}
                  </p>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => approve(u.id, false)}
                      className="flex-1 h-8 rounded-md bg-okay/15 text-okay text-xs font-semibold hover:bg-okay/25"
                    >
                      Approve Driver
                    </button>
                    <button
                      onClick={() => approve(u.id, true)}
                      className="flex-1 h-8 rounded-md bg-amber/15 text-amber text-xs font-semibold hover:bg-amber/25"
                    >
                      Approve Admin
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between px-1 mb-2">
            <p className="text-xs uppercase tracking-wide text-yard-faint">
              {showAll ? `Roster (${active.length})` : `Active Now (${visibleActive.length})`}
            </p>
            <button
              onClick={() => setShowAll((v) => !v)}
              className="text-[11px] font-semibold uppercase tracking-wide text-amber hover:underline"
            >
              {showAll ? "Show Active Only" : "Show All"}
            </button>
          </div>
          <div className="space-y-1.5">
            {visibleActive.length === 0 && (
              <p className="text-sm text-yard-faint px-1 py-6 text-center">
                {showAll ? "No users yet." : "No one's active right now."}
              </p>
            )}
            {visibleActive.map((u) => {
              const isOnline = onlineIds.has(u.id);
              const isProtected = u.email.toLowerCase() === PROTECTED_EMAIL;
              return (
                <button
                  key={u.id}
                  onClick={() => setEditingUser(u)}
                  className="w-full flex items-center gap-3 px-2 py-2 rounded-card hover:bg-yard-panel text-left"
                >
                  <div className="relative shrink-0">
                    <div className="h-9 w-9 rounded-full bg-yard-panel border border-yard-border flex items-center justify-center text-xs font-semibold text-yard-muted">
                      {initials(u.first_name, u.last_name)}
                    </div>
                    <span
                      className={cn(
                        "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-yard-bg",
                        isOnline ? "bg-okay animate-pulseSlow" : "bg-yard-faint"
                      )}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-yard-text truncate">
                      {u.first_name} {u.last_name}
                    </p>
                    <p className="text-xs text-yard-faint truncate">
                      {isOnline ? "Active now" : "Offline"}
                    </p>
                  </div>
                  {u.id !== currentProfile.id && (
                    <span
                      role="button"
                      onClick={(e) => toggleAdmin(e, u.id, u.is_admin, u.email)}
                      title={isProtected ? "This account cannot be changed" : undefined}
                      className={cn(
                        "shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full border",
                        u.is_admin
                          ? "text-amber border-amber/40 bg-amber/10"
                          : "text-yard-faint border-yard-border",
                        isProtected && "opacity-60 cursor-not-allowed"
                      )}
                    >
                      {u.is_admin ? "Admin" : "Driver"}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <EditUserModal user={editingUser} onClose={() => setEditingUser(null)} />
    </aside>
  );
}
