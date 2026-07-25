"use client";

import { cn } from "@/lib/utils";
import { RefreshCw } from "lucide-react";
import { useRef, useState } from "react";

interface PullToRefreshProps {
  onRefresh: () => void | Promise<void>;
  children: React.ReactNode;
  className?: string;
}

const THRESHOLD = 70;
const MAX_PULL = 110;

export function PullToRefresh({ onRefresh, children, className }: PullToRefreshProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number | null>(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  function handleTouchStart(e: React.TouchEvent) {
    if (containerRef.current && containerRef.current.scrollTop === 0 && !refreshing) {
      startY.current = e.touches[0].clientY;
    } else {
      startY.current = null;
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (startY.current === null) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0) {
      // damped pull so it feels elastic rather than 1:1
      setPull(Math.min(MAX_PULL, delta * 0.5));
    }
  }

  async function handleTouchEnd() {
    if (startY.current === null) return;
    startY.current = null;

    if (pull >= THRESHOLD) {
      setRefreshing(true);
      setPull(THRESHOLD);
      await onRefresh();
      setRefreshing(false);
    }
    setPull(0);
  }

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={cn("relative overflow-y-auto scrollbar-hidden", className)}
    >
      <div
        className="flex items-center justify-center overflow-hidden transition-[height] duration-200"
        style={{ height: refreshing ? THRESHOLD : pull }}
      >
        <RefreshCw
          size={18}
          className={cn(
            "text-amber",
            refreshing && "animate-spin",
            !refreshing && pull > 0 && "transition-transform"
          )}
          style={
            !refreshing
              ? { transform: `rotate(${(pull / THRESHOLD) * 360}deg)` }
              : undefined
          }
        />
      </div>
      {children}
    </div>
  );
}
