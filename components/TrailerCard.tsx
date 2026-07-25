"use client";

import { Trailer } from "@/lib/types";
import { cn } from "@/lib/utils";

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
      <div className="flex-1 flex items-center justify-center py-6">
        <p className="font-stencil font-bold text-2xl sm:text-3xl tracking-wider text-yard-text">
          {trailer.equipment_number}
        </p>
      </div>
    </button>
  );
}
