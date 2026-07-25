"use client";

import { Trailer } from "@/lib/types";
import { cn, formatRelativeTime } from "@/lib/utils";
import { ChevronRight, User } from "lucide-react";

interface TrailerCardProps {
  trailer: Trailer;
  onClick: () => void;
}

export function TrailerCard({ trailer, onClick }: TrailerCardProps) {
  const isDeparted = trailer.status === "departed";

  return (
    <button
      onClick={onClick}
      className="w-full flex items-stretch gap-0 bg-yard-surface border border-yard-border rounded-card overflow-hidden text-left hover:border-yard-borderLight active:scale-[0.99] transition-all"
    >
      <div
        className={cn(
          "w-1.5 shrink-0",
          isDeparted ? "bg-depart" : "bg-amber"
        )}
      />
      <div className="flex-1 flex items-center justify-between gap-3 px-4 py-3.5">
        <div className="min-w-0">
          <p className="font-stencil font-bold text-lg sm:text-xl tracking-wider text-yard-text truncate">
            {trailer.equipment_number}
          </p>
          <p className="text-sm text-yard-muted truncate mt-0.5">
            {trailer.destination ?? "No destination"}
            {trailer.load_percentage != null && (
              <span className="text-yard-faint"> · {trailer.load_percentage}%</span>
            )}
          </p>
          {isDeparted && trailer.assigned_driver_name && (
            <p className="flex items-center gap-1 text-xs text-depart mt-1">
              <User size={12} />
              {trailer.assigned_driver_name} · {formatRelativeTime(trailer.updated_at)}
            </p>
          )}
        </div>
        <ChevronRight size={20} className="shrink-0 text-yard-faint" />
      </div>
    </button>
  );
}
