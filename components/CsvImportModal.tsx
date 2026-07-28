"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { createClient } from "@/lib/supabase/client";
import { parseImportRows } from "@/lib/importParser";
import { ParsedTrailerRow, RawImportRow } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import * as XLSX from "xlsx";

interface CsvImportModalProps {
  open: boolean;
  onClose: () => void;
}

type Stage = "upload" | "review" | "importing" | "done";

export function CsvImportModal({ open, onClose }: CsvImportModalProps) {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>("upload");
  const [dragOver, setDragOver] = useState(false);
  const [rows, setRows] = useState<ParsedTrailerRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState(0);

  function reset() {
    setStage("upload");
    setRows([]);
    setError(null);
    setImportedCount(0);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleFile(file: File) {
    setError(null);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const raw: RawImportRow[] = XLSX.utils.sheet_to_json(firstSheet, { defval: null });

      if (raw.length === 0) {
        setError("That file doesn't have any rows in it.");
        return;
      }

      const parsed = parseImportRows(raw);
      setRows(parsed);
      setStage("review");
    } catch (err) {
      console.error(err);
      setError("Couldn't read that file. Make sure it's a .csv or .xlsx.");
    }
  }

  function updateRow(rowIndex: number, patch: Partial<ParsedTrailerRow>) {
    setRows((current) =>
      current.map((r) => {
        if (r.row_index !== rowIndex) return r;
        const updated = { ...r, ...patch };
        const stillMissing: string[] = [];
        if (!updated.equipment_number) stillMissing.push("Missing equipment number");
        if (!updated.pickup_number) stillMissing.push("Missing pickup number");
        return { ...updated, issues: stillMissing };
      })
    );
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
      status: "at_rail" as const,
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
    <Modal open={open} onClose={handleClose} title="Import Equipment">
      {stage === "upload" && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) handleFile(file);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "flex flex-col items-center justify-center gap-3 rounded-card border-2 border-dashed py-12 cursor-pointer transition-colors",
            dragOver ? "border-amber bg-amber/5" : "border-yard-border hover:border-yard-borderLight"
          )}
        >
          <UploadCloud size={28} className="text-yard-faint" />
          <p className="text-sm text-yard-muted text-center px-6">
            Drag a .csv or .xlsx file here, or tap to browse
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          {error && (
            <p className="text-sm text-danger bg-danger/10 border border-danger/30 rounded-card px-3 py-2 mx-6">
              {error}
            </p>
          )}
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

          <Button
            className="w-full"
            disabled={validRows.length === 0}
            onClick={handleImport}
          >
            Fix &amp; Import ({validRows.length})
          </Button>
        </div>
      )}

      {stage === "importing" && (
        <div className="py-12 text-center">
          <div className="h-8 w-8 mx-auto rounded-full border-2 border-amber border-t-transparent animate-spin mb-4" />
          <p className="text-sm text-yard-muted">Writing to the yard board…</p>
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
