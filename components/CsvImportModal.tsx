"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { createClient } from "@/lib/supabase/client";
import { ParsedTrailerRow, RawImportRow } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import * as XLSX from "xlsx";

interface CsvImportModalProps {
  open: boolean;
  onClose: () => void;
}

type Stage = "upload" | "validating" | "review" | "importing" | "done";

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
    setStage("validating");

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const raw: RawImportRow[] = XLSX.utils.sheet_to_json(firstSheet, { defval: null });

      if (raw.length === 0) {
        setError("That file doesn't have any rows in it.");
        setStage("upload");
        return;
      }

      const res = await
