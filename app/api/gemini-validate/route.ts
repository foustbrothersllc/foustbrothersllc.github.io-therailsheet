import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { RawImportRow, ParsedTrailerRow } from "@/lib/types";

export const runtime = "nodejs";

const REQUIRED_FIELDS = ["equipment_number", "pickup_number"] as const;

function buildPrompt(rows: RawImportRow[]): string {
  return `You are a strict data-cleaning engine for a rail yard trailer inventory system.

You will receive an array of raw spreadsheet rows with arbitrary/inconsistent column names
(e.g. "Dest", "Destination Site", "Drop Point" all mean "destination"). For EACH row, map it
onto this exact schema and clean the values:

- equipment_number: string. Uppercase, no spaces (e.g. "emhu489025" -> "EMHU489025").
  Column headers that mean this field include: "Equipment Number", "Equipment #", "Trailer",
  "Trailer #", "Trailer Number", "Unit", "Unit #", "Container", "Rental", "UPI".
  If no column header clearly matches any of these, look at the FIRST column in the sheet —
  if its values look like equipment/trailer identifiers (a mix of letters and digits, no
  spaces, e.g. "EMHU489025", "PTLZ568244", "853124"), use that column as equipment_number
  even though its header didn't match.
- pickup_number: string.
- origin: string or null.
- origin_sort_type: string or null (the sort type at the origin).
- destination: string or null.
- destination_sort_type: string or null (the sort type at the destination).
- load_percentage: integer 0-100, or null if not present/not applicable.

Required fields: equipment_number, pickup_number.
origin, origin_sort_type, destination, destination_sort_type, and load_percentage are all optional.
All text values should be returned in UPPERCASE.

For each input row (in the same order as given, 0-indexed as row_index), output an object:
{
  "row_index": number,
  "equipment_number": string | null,
  "pickup_number": string | null,
  "origin": string | null,
  "origin_sort_type": string | null,
  "destination": string | null,
  "destination_sort_type": string | null,
  "load_percentage": number | null,
  "issues": string[]   // human-readable problems, e.g. "Missing pickup number". Empty array if the row is clean.
}

Respond with ONLY a raw JSON array of these objects — no markdown fences, no commentary, no preamble.

Input rows:
${JSON.stringify(rows)}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rows: RawImportRow[] = body.rows;

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No rows provided." }, { status: 400 });
    }
    if (rows.length > 500) {
      return NextResponse.json(
        { error: "Import is limited to 500 rows at a time." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured on the server." },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const result = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: buildPrompt(rows),
      config: { responseMimeType: "application/json" },
    });

    const text =
      result.text ??
      result.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ??
      "";

    let parsed: ParsedTrailerRow[];
    try {
      parsed = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: "The AI validator returned an unexpected format. Try again." },
        { status: 502 }
      );
    }

    // Belt-and-suspenders: re-check required fields server-side in case the
    // model missed something, and re-uppercase equipment numbers.
    const cleaned: ParsedTrailerRow[] = parsed.map((row, i) => {
      const issues = [...(row.issues ?? [])];
      for (const field of REQUIRED_FIELDS) {
        const value = row[field];
        if (value === null || value === undefined || String(value).trim() === "") {
          const label = field.replace("_", " ");
          if (!issues.some((iss) => iss.toLowerCase().includes(label))) {
            issues.push(`Missing ${label}`);
          }
        }
      }
      return {
        ...row,
        row_index: row.row_index ?? i,
        equipment_number: row.equipment_number
          ? row.equipment_number.toUpperCase().replace(/\s+/g, "")
          : null,
        issues,
      };
    });

    return NextResponse.json({ rows: cleaned });
  } catch (err) {
    console.error("gemini-validate error", err);
    return NextResponse.json(
      { error: "Validation failed. Check the server logs." },
      { status: 500 }
    );
  }
}
