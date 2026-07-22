import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { RawImportRow, ParsedTrailerRow } from "@/lib/types";

export const runtime = "nodejs";

const SCHEMA_FIELDS = [
  "equipment_number",
  "pickup_number",
  "origin",
  "destination",
  "sort_type",
  "load_percentage",
] as const;

function buildPrompt(rows: RawImportRow[]): string {
  return `You are a strict data-cleaning engine for a rail yard trailer inventory system.

You will receive an array of raw spreadsheet rows with arbitrary/inconsistent column names
(e.g. "Dest", "Destination Site", "Drop Point" all mean "destination"). For EACH row, map it
onto this exact schema and clean the values:

- equipment_number: string. Uppercase, no spaces (e.g. "emhu489025" -> "EMHU489025").
- pickup_number: string.
- origin: string.
- destination: string.
- sort_type: string.
- load_percentage: integer 0-100, or null if not present/not applicable.

Required fields: equipment_number, pickup_number, origin, destination, sort_type.
load_percentage is optional.

For each input row (in the same order as given, 0-indexed as row_index), output an object:
{
  "row_index": number,
  "equipment_number": string | null,
  "pickup_number": string | null,
  "origin": string | null,
  "destination": string | null,
  "sort_type": string | null,
  "load_percentage": number | null,
  "issues": string[]   // human-readable problems, e.g. "Missing destination". Empty array if the row is clean.
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

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: { responseMimeType: "application/json" },
    });

    const result = await model.generateContent(buildPrompt(rows));
    const text = result.response.text();

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
      const required: (typeof SCHEMA_FIELDS)[number][] = [
        "equipment_number",
        "pickup_number",
        "origin",
        "destination",
        "sort_type",
      ];
      for (const field of required) {
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
