"use client";

import { cn } from "@/lib/utils";
import { useEffect } from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Bottom sheet on mobile, small centered card on desktop instead of the default wide panel */
  compact?: boolean;
  /** Override the title's text size/weight classes for a specific modal */
  titleClassName?: string;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  compact,
  titleClassName,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/70 animate-fadeIn"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative w-full bg-yard-panel border-t sm:border border-yard-border shadow-panel animate-slideUp sm:animate-fadeIn",
          "max-h-[90vh] overflow-y-auto scrollbar-hidden",
          "rounded-t-2xl sm:rounded-card",
          compact ? "sm:max-w-sm" : "sm:max-w-lg"
        )}
      >
        <div className="sticky top-0 flex items-center justify-between px-5 py-4 bg-yard-panel border-b border-yard-border">
          <h2
            className={cn(
              "font-display tracking-wide uppercase text-yard-text",
              titleClassName ?? "text-lg"
            )}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="h-9 w-9 flex items-center justify-center rounded-full text-yard-muted hover:text-yard-text hover:bg-yard-border shrink-0"
          >
            <X size={20} />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && (
          <div className="sticky bottom-0 px-5 py-4 bg-yard-panel border-t border-yard-border flex gap-3 justify-end">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
