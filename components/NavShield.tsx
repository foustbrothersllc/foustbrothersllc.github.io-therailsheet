"use client";

import { Shield } from "lucide-react";
import Link from "next/link";

export function NavShield() {
  return (
    <Link
      href="/admin"
      aria-label="Admin"
      className="h-10 w-10 flex items-center justify-center rounded-full text-amber hover:bg-amber/10 transition-colors"
    >
      <Shield size={20} strokeWidth={2} />
    </Link>
  );
}
