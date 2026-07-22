"use client";

import { Trailer } from "@/lib/types";
import { cn, formatRelativeTime } from "@/lib/utils";
import { Pencil, RotateCcw, Trash2, User } from "lucide-react";

interface AdminTrailerCardProps {
  trailer: Trailer;
  onRevert: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function AdminTrailerCard({ trailer, onRevert, onEdit, onDelete }: AdminTrailerCardProps) {
  const isDeparted = trailer.status === "departed";

  return (
    <div className="flex items-stretch bg-yard-surface border border-yard-border rounded-card overflow-hidden">
      <div className={cn("w-1.5 shrink-0", isDeparted ? "bg-depart" : "bg-amber")} />
      <div className="flex-1 min-w-0 px-3.5 py-3">
        <p className="font-stencil font-bold text-base tracking-wider text-yard-text truncate">
          {trailer.equipment_number}
        </p>
        <p className="text-xs text-yard-muted truncate mt-0.5">
          {trailer.origin} → {trailer.destination} · {trailer.sort_type}
        </p>
        {isDeparted && trailer.assigned_driver_name && (
          <p className="flex items-center gap-1 text-xs text-depart mt-1">
            <User size={11} />
            {trailer.assigned_driver_name} ({trailer.assigned_driver_emp_id}) ·{" "}
            {formatRelativeTime(trailer.updated_at)}
          </p>
        )}
      </div>
      <div className="flex items-center gap-0.5 px-2 border-l border-yard-border shrink-0">
        {isDeparted && (
          <button
            onClick={onRevert}
            title="Revert to At Rail"
            aria-label="Revert to At Rail"
            className="h-9 w-9 flex items-center justify-center rounded-full text-yard-muted hover:text-okay hover:bg-okay/10"
          >
            <RotateCcw size={16} />
          </button>
        )}
        <button
          onClick={onEdit}
          title="Edit"
          aria-label="Edit"
          className="h-9 w-9 flex items-center justify-center rounded-full text-yard-muted hover:text-amber hover:bg-amber/10"
        >
          <Pencil size={16} />
        </button>
        <button
          onClick={onDelete}
          title="Delete"
          aria-label="Delete"
          className="h-9 w-9 flex items-center justify-center rounded-full text-yard-muted hover:text-danger hover:bg-danger/10"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
