"use client";

import { Trailer } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Tag } from "lucide-react";

interface TrailerCardProps {
  trailer: Trailer;
  onClick: () => void;
}

export function TrailerCard({ trailer, onClick }: TrailerCardProps) {
  const isDeparted = trailer.status === "departed";

  return (
    <button
      onClick={onClick}
      className="w-full flex items-stretch bg-yard-surface border border-yard-border rounded-card overflow-hidden hover:border-yard-borderLight active:scale-[0.99] transition-all"
    >
      <div className={cn("w-1.5 shrink-0", isDeparted ? "bg-depart" : "bg-amber")} />
      <div className="flex-1 flex flex-col items-center justify-center gap-1.5 py-6">
        {trailer.flag_note && (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-danger bg-danger/15 border border-danger/30 rounded-full px-2 py-0.5">
            <Tag size={10} />
            Flagged
          </span>
        )}
        <p className="font-stencil font-bold text-2xl sm:text-3xl tracking-wider text-yard-text">
          {trailer.equipment_number}
        </p>
      </div>
    </button>
  );
}
