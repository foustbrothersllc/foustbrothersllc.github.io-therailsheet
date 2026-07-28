import { ParsedTrailerRow, RawImportRow } from "@/lib/types";

type Field =
  | "equipment_number"
  | "pickup_number"
  | "origin"
  | "origin_sort_type"
  | "destination"
  | "destination_sort_type"
  | "load_percentage";

const ALIASES: Record<Field, string[]> = {
  equipment_number: [
    "equipment number", "equipment #", "equipment#", "equipment",
    "trailer", "trailer #", "trailer#", "trailer number",
    "unit", "unit #", "unit#", "container", "rental", "upi", "equip", "equip #", "equip#",
    "uld", "uld #", "uld#", "uld number",
  ],
  pickup_number: [
    "pickup number", "pickup #", "pickup#", "pickup",
    "pu #", "pu#", "po number", "po #", "order number", "order #",
  ],
  origin: ["origin", "from", "ship from", "origin city", "origin site"],
  origin_sort_type: ["origin sort", "origin sort type", "o sort", "osort"],
  destination: ["destination", "dest", "destination site", "drop point", "ship to", "to"],
  destination_sort_type: ["destination sort", "destination sort type", "d sort", "dsort", "dest sort"],
  load_percentage: ["load %", "load percent", "load percentage", "load", "%"],
};

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[._\-]+/g, " ").replace(/\s+/g, " ");
}

function looksLikeEquipmentId(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  const v = String(value).trim().replace(/\s+/g, "");
  if (!v) return false;
  return /^[A-Za-z]{2,4}\d{4,8}$/.test(v) || /^\d{4,8}$/.test(v);
}

function buildColumnMapping(headers: string[]): Partial<Record<Field, string>> {
  const mapping: Partial<Record<Field, string>> = {};
  const normalized = headers.map((h) => ({ raw: h, norm: normalizeHeader(h) }));

  (Object.keys(ALIASES) as Field[]).forEach((field) => {
    const match = normalized.find((h) => ALIASES[field].includes(h.norm));
    if (match) mapping[field] = match.raw;
  });

  // Fallback: if nothing matched equipment_number by header name, check whether
  // the first column's values actually look like equipment identifiers before
  // trusting it.
  if (!mapping.equipment_number && headers.length > 0) {
    mapping.equipment_number = headers[0];
  }

  return mapping;
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

export function parseImportRows(rawRows: RawImportRow[]): ParsedTrailerRow[] {
  if (rawRows.length === 0) return [];

  const headers = Object.keys(rawRows[0]);
  const mapping = buildColumnMapping(headers);

  // Confirm the equipment_number fallback column actually looks right before
  // trusting it, when it wasn't matched by header name.
  const fallbackUsed =
    mapping.equipment_number === headers[0] &&
    !ALIASES.equipment_number.includes(normalizeHeader(headers[0]));

  if (fallbackUsed) {
    const sample = rawRows.slice(0, Math.min(10, rawRows.length));
    const passCount = sample.filter((r) => looksLikeEquipmentId(r[headers[0]])).length;
    if (passCount === 0) {
      delete mapping.equipment_number;
    }
  }

  return rawRows.map((row, i) => {
    const equipment_number = mapping.equipment_number
      ? cleanEquipmentNumber(row[mapping.equipment_number])
      : null;
    const pickup_number = mapping.pickup_number ? cleanText(row[mapping.pickup_number]) : null;
    const origin = mapping.origin ? cleanText(row[mapping.origin]) : null;
    const origin_sort_type = mapping.origin_sort_type
      ? cleanText(row[mapping.origin_sort_type])
      : null;
    const destination = mapping.destination ? cleanText(row[mapping.destination]) : null;
    const destination_sort_type = mapping.destination_sort_type
      ? cleanText(row[mapping.destination_sort_type])
      : null;
    const load_percentage = mapping.load_percentage
      ? cleanLoadPercentage(row[mapping.load_percentage])
      : null;

    const issues: string[] = [];
    if (!equipment_number) issues.push("Missing equipment number");
    if (!pickup_number) issues.push("Missing pickup number");

    return {
      row_index: i,
      equipment_number,
      pickup_number,
      origin,
      origin_sort_type,
      destination,
      destination_sort_type,
      load_percentage,
      issues,
    };
  });
}
