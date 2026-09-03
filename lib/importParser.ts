import { ParsedTrailerRow } from "@/lib/types";

type Field =
  | "equipment_number"
  | "pickup_number"
  | "origin"
  | "origin_sort_type"
  | "destination"
  | "destination_sort_type"
  | "load_percentage"
  | "due_date";

// Ordered most-specific-first: an earlier alias always wins over a later
// one if a sheet has multiple columns that could plausibly match (e.g. a
// generic "Dest" decoy column alongside the real "Ld Dest Abbr" column).
const ALIASES: Record<Field, string[]> = {
  equipment_number: [
    "uld #", "uld#", "uld", "uld number",
    "equipment number", "equipment #", "equipment#", "equipment",
    "trailer", "trailer #", "trailer#", "trailer number",
    "unit", "unit #", "unit#", "container", "rental", "upi", "equip", "equip #", "equip#",
  ],
  pickup_number: [
    "pickup #", "pickup#", "pickup number", "pickup",
    "pu #", "pu#", "po number", "po #", "order number", "order #",
  ],
  origin: [
    "ld orig abbr", "orig abbr", "origin abbr",
    "origin", "from", "ship from", "origin city", "origin site",
  ],
  origin_sort_type: [
    "orig srt", "origin srt", "origin sort", "origin sort type", "o sort", "osort",
  ],
  destination: [
    "ld dest abbr", "dest abbr", "destination abbr",
    "destination", "destination site", "drop point", "ship to", "to", "dest",
  ],
  destination_sort_type: [
    "ld dest srt", "dest srt", "destination srt",
    "destination sort", "destination sort type", "d sort", "dsort", "dest sort",
  ],
  load_percentage: ["load %", "load percent", "load percentage", "load", "%"],
  // Optional — not every sheet has this column, and that's fine; a row
  // with no matching column just gets due_date: null.
  due_date: ["due dt", "due date", "duedate", "due", "date due"],
};

const ALL_ALIASES = new Set(Object.values(ALIASES).flat());

function normalizeHeader(header: unknown): string {
  return String(header ?? "")
    .trim()
    .toLowerCase()
    .replace(/[._\-]+/g, " ")
    .replace(/\s+/g, " ");
}

function looksLikeEquipmentId(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  const v = String(value).trim().replace(/\s+/g, "");
  if (!v) return false;
  return /^[A-Za-z]{2,4}\d{4,8}$/.test(v) || /^\d{4,8}$/.test(v);
}

function cleanText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s ? s.toUpperCase() : null;
}

function cleanEquipmentNumber(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim().toUpperCase().replace(/\s+/g, "");
  return s || null;
}

function cleanLoadPercentage(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(String(value).replace(/[^0-9.-]/g, ""));
  if (Number.isNaN(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/** Returns "YYYY-MM-DD", or null if the cell is empty/unparseable. Handles
 * plain text dates ("9/2/2026") from CSVs and Excel's numeric date serials
 * (from .xlsx files parsed with `raw: true`). */
function cleanDate(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "number") {
    // Excel serial date: days since 1899-12-30 (accounts for Excel's leap-year bug).
    const ms = Math.round((value - 25569) * 86400 * 1000);
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }

  const s = String(value).trim();
  if (!s) return null;

  const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slash) {
    const [, mm, dd, yRaw] = slash;
    const yyyy = yRaw.length === 2 ? `20${yRaw}` : yRaw;
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }

  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    const [, yyyy, mm, dd] = iso;
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }

  const parsed = new Date(s);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

/**
 * Some real-world export reports have title/blank rows before the actual
 * header row. Scan the first several rows and pick the one whose cells
 * best match our known field-header vocabulary, instead of always
 * assuming row 0 is the header.
 */
function findHeaderRowIndex(rows: unknown[][]): number {
  let bestIndex = 0;
  let bestScore = -1;
  const scanLimit = Math.min(20, rows.length);

  for (let i = 0; i < scanLimit; i++) {
    const row = rows[i] ?? [];
    const score = row.reduce(
      (acc: number, cell) => acc + (ALL_ALIASES.has(normalizeHeader(cell)) ? 1 : 0),
      0
    );
    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  // Require at least 2 recognizable headers to trust the detection; otherwise
  // fall back to the first non-empty row (typical simple-CSV case).
  if (bestScore >= 2) return bestIndex;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] ?? [];
    if (row.some((c) => c !== null && c !== undefined && String(c).trim() !== "")) {
      return i;
    }
  }
  return 0;
}

function buildColumnMapping(headers: string[]): Partial<Record<Field, string>> {
  const mapping: Partial<Record<Field, string>> = {};
  const normalized = headers.map((h) => ({ raw: h, norm: normalizeHeader(h) }));

  (Object.keys(ALIASES) as Field[]).forEach((field) => {
    for (const alias of ALIASES[field]) {
      const match = normalized.find((h) => h.norm === alias);
      if (match) {
        mapping[field] = match.raw;
        break;
      }
    }
  });

  return mapping;
}

/** Re-checks required fields AND duplicate equipment numbers across the
 * whole set — call this after any edit too, since fixing one row's
 * equipment number can resolve (or create) a duplicate with another row. */
export function recomputeIssues(rows: ParsedTrailerRow[]): ParsedTrailerRow[] {
  const counts = new Map<string, number>();
  rows.forEach((r) => {
    if (r.equipment_number) {
      counts.set(r.equipment_number, (counts.get(r.equipment_number) ?? 0) + 1);
    }
  });

  return rows.map((r) => {
    const issues: string[] = [];
    if (!r.equipment_number) issues.push("Missing equipment number");
    if (!r.pickup_number) issues.push("Missing pickup number");
    if (r.equipment_number && (counts.get(r.equipment_number) ?? 0) > 1) {
      issues.push("Duplicate equipment number in this file");
    }
    return { ...r, issues };
  });
}

/**
 * Takes a sheet already parsed as an array-of-arrays (XLSX's `header: 1`
 * mode, or a CSV split into raw rows) and turns it into cleaned trailer
 * rows, auto-detecting the header row and mapping columns by known aliases.
 */
export function parseSheetRows(rawRows: unknown[][]): ParsedTrailerRow[] {
  if (rawRows.length === 0) return [];

  const headerRowIndex = findHeaderRowIndex(rawRows);
  const headerRow = rawRows[headerRowIndex] ?? [];
  const headers = headerRow.map((h, i) =>
    h !== null && h !== undefined && String(h).trim() !== ""
      ? String(h).trim()
      : `Column ${i + 1}`
  );

  const dataRows = rawRows
    .slice(headerRowIndex + 1)
    .filter((row) => row.some((c) => c !== null && c !== undefined && String(c).trim() !== ""));

  let mapping = buildColumnMapping(headers);

  // Fallback: if nothing matched equipment_number by header name, check
  // whether the first column's values actually look like equipment
  // identifiers before trusting it as a last resort.
  if (!mapping.equipment_number && headers.length > 0) {
    const firstHeader = headers[0];
    const sample = dataRows.slice(0, Math.min(10, dataRows.length));
    const passCount = sample.filter((r) => looksLikeEquipmentId(r[0])).length;
    if (passCount > 0) {
      mapping = { ...mapping, equipment_number: firstHeader };
    }
  }

  const parsed = dataRows.map((row, i) => {
    const get = (field: Field) => {
      const header = mapping[field];
      if (!header) return null;
      const colIndex = headers.indexOf(header);
      return colIndex >= 0 ? row[colIndex] : null;
    };

    return {
      row_index: i,
      equipment_number: cleanEquipmentNumber(get("equipment_number")),
      pickup_number: cleanText(get("pickup_number")),
      origin: cleanText(get("origin")),
      origin_sort_type: cleanText(get("origin_sort_type")),
      destination: cleanText(get("destination")),
      destination_sort_type: cleanText(get("destination_sort_type")),
      load_percentage: cleanLoadPercentage(get("load_percentage")),
      due_date: cleanDate(get("due_date")),
      issues: [] as string[],
    };
  });

  return recomputeIssues(parsed);
}
