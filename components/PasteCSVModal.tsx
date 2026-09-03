"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { createClient } from "@/lib/supabase/client";
import { parseSheetRows, recomputeIssues } from "@/lib/importParser";
import { ParsedTrailerRow } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useState } from "react";

interface PasteCSVModalProps {
  open: boolean;
  onClose: () => void;
}

type Stage = "paste" | "review" | "importing" | "done";

export function PasteCSVModal({ open, onClose }: PasteCSVModalProps) {
  const supabase = createClient();
  const [stage, setStage] = useState<Stage>("paste");
  const [csvText, setCsvText] = useState("");
  const [rows, setRows] = useState<ParsedTrailerRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState(0);

  function reset() {
    setStage("paste");
    setCsvText("");
    setRows([]);
    setError(null);
    setImportedCount(0);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function parseCSVText() {
    setError(null);

    try {
      // Split by newlines and parse as CSV
      const lines = csvText
        .trim()
        .split("\n")
        .map((line) =>
          line.split(",").map((cell) => {
            const trimmed = cell.trim();
            return trimmed === "" ? null : trimmed;
          })
        );

      if (lines.length === 0) {
        setError("No data to parse.");
        return;
      }

      const parsed = parseSheetRows(lines);
      if (parsed.length === 0) {
        setError("Couldn't find any data rows in that CSV.");
        return;
      }

      setRows(parsed);
      setStage("review");
    } catch (err) {
      console.error(err);
      setError("Couldn't parse that CSV. Make sure it's comma-separated.");
    }
  }

  function updateRow(rowIndex: number, patch: Partial<ParsedTrailerRow>) {
    setRows((current) => {
      const updated = current.map((r) =>
        r.row_index === rowIndex ? { ...r, ...patch } : r
      );
      return recomputeIssues(updated);
    });
  }

  async function handleImport() {
    setStage("importing");
    const cleanRows = rows.filter((r) => r.issues.length === 0);

    const payload = cleanRows.map((r) => ({
      equipment_number: r.equipment_number!,
      pickup_number: r.pickup_number!,
      origin: r.origin || null,
      origin_sort_type: r.origin_sort_type || null,
      destination: r.destination || null,
      destination_sort_type: r.destination_sort_type || null,
      load_percentage: r.load_percentage,
      due_date: r.due_date,
    }));

    const { error } = await supabase
      .from("trailers")
      .upsert(payload, { onConflict: "equipment_number", ignoreDuplicates: false });

    if (error) {
      setError(error.message);
      setStage("review");
      return;
    }

    setImportedCount(payload.length);
    setStage("done");
  }

  const validRows = rows.filter((r) => r.issues.length === 0);
  const problemRows = rows.filter((r) => r.issues.length > 0);

  return (
    <Modal open={open} onClose={handleClose} title="Paste CSV Data">
      {stage === "paste" && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wide text-yard-muted mb-2">
              Paste CSV Data
            </label>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="Equipment #,Pickup #,Origin,Destination&#10;EMHU489025,PU123,CHI,NYC&#10;EMHU489026,PU124,LAX,DEN"
              rows={8}
              className="w-full px-3.5 py-3 rounded-card bg-yard-bg border border-yard-border focus:border-amber outline-none text-sm font-mono resize-none"
            />
            <p className="text-xs text-yard-muted mt-2">
              Paste data directly from Excel (copy and paste as CSV format)
            </p>
          </div>

          {error && (
            <p className="text-sm text-danger bg-danger/10 border border-danger/30 rounded-card px-3 py-2">
              {error}
            </p>
          )}

          <Button
            className="w-full"
            disabled={csvText.trim().length === 0}
            onClick={parseCSVText}
          >
            Parse & Review
          </Button>
        </div>
      )}

      {stage === "review" && (
        <div className="space-y-5">
          <div className="flex gap-4 text-sm">
            <span className="flex items-center gap-1.5 text-okay">
              <CheckCircle2 size={16} /> {validRows.length} ready
            </span>
            <span className="flex items-center gap-1.5 text-amber">
              <AlertTriangle size={16} /> {problemRows.length} need attention
            </span>
          </div>

          {problemRows.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wide text-amber mb-2">Problem Rows</p>
              <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-hidden">
                {problemRows.map((r) => (
                  <div
                    key={r.row_index}
                    className="bg-amber/5 border border-amber/25 rounded-card p-3 space-y-2"
                  >
                    <p className="text-xs text-amber">
                      Row {r.row_index + 1}: {r.issues.join(", ")}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {(
                        [
                          ["equipment_number", "Equipment #"],
                          ["pickup_number", "Pickup #"],
                          ["origin", "Origin"],
                          ["origin_sort_type", "Origin Sort"],
                          ["destination", "Destination"],
                          ["destination_sort_type", "Destination Sort"],
                        ] as const
                      ).map(([key, label]) => (
                        <input
                          key={key}
                          value={r[key] ?? ""}
                          onChange={(e) => updateRow(r.row_index, { [key]: e.target.value })}
                          placeholder={label}
                          className="h-9 px-2.5 rounded-md bg-yard-bg border border-yard-border text-xs focus:border-amber outline-none"
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {validRows.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wide text-okay mb-2">
                Ready to Import
              </p>
              <div className="max-h-40 overflow-y-auto scrollbar-hidden space-y-1">
                {validRows.map((r) => (
                  <div
                    key={r.row_index}
                    className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-md bg-okay/5"
                  >
                    <span className="font-stencil font-semibold">{r.equipment_number}</span>
                    <span className="text-yard-faint">{r.destination}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-danger bg-danger/10 border border-danger/30 rounded-card px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setStage("paste")}
              className="flex-1"
            >
              Back
            </Button>
            <Button
              className="flex-1"
              disabled={validRows.length === 0}
              onClick={handleImport}
            >
              Import ({validRows.length})
            </Button>
          </div>
        </div>
      )}

      {stage === "importing" && (
        <div className="py-12 text-center">
          <div className="h-8 w-8 mx-auto rounded-full border-2 border-amber border-t-transparent animate-spin mb-4" />
          <p className="text-sm text-yard-muted">Importing trailers…</p>
        </div>
      )}

      {stage === "done" && (
        <div className="py-10 text-center space-y-4">
          <CheckCircle2 size={32} className="mx-auto text-okay" />
          <p className="text-sm text-yard-text">
            Imported {importedCount} trailer{importedCount === 1 ? "" : "s"}.
          </p>
          <Button onClick={handleClose} className="w-full">
            Done
          </Button>
        </div>
      )}
    </Modal>
  );
}
