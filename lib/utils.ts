export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

/** Uppercases and strips whitespace from equipment numbers, e.g. "emhu489025 " -> "EMHU489025" */
export function standardizeEquipmentNumber(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

/** Live uppercase-as-you-type for free-text fields (pickup #, origin, sort types, etc.) */
export function upper(value: string): string {
  return value.toUpperCase();
}

export function hoursSince(isoTimestamp: string): number {
  const then = new Date(isoTimestamp).getTime();
  const now = Date.now();
  return (now - then) / (1000 * 60 * 60);
}

export function formatRelativeTime(isoTimestamp: string): string {
  const hrs = hoursSince(isoTimestamp);
  if (hrs < 1) {
    const mins = Math.max(1, Math.round(hrs * 60));
    return `${mins}m ago`;
  }
  if (hrs < 24) {
    return `${Math.round(hrs)}h ago`;
  }
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

export function initials(first: string, last: string): string {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
}
