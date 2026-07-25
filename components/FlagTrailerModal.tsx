"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { createClient } from "@/lib/supabase/client";
import { Trailer } from "@/lib/types";
import { useEffect, useState } from "react";

interface FlagTrailerModalProps {
  trailer: Trailer | null;
  onClose: () => void;
}

export function FlagTrailerModal({ trailer, onClose }: FlagTrailerModalProps) {
  const supabase = createClient();
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (trailer) {
      setNote(trailer.flag_note ?? "");
      setError(null);
    }
  }, [trailer]);

  if (!trailer) return null;

  async function handleSave() {
    setSaving(true);
    setError(null);
    const { error } = await supabase
      .from("trailers")
      .update({ flag_note: note.trim() || null })
      .eq("id", trailer!.id);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    onClose();
  }

  async function handleClear() {
    setSaving(true);
    setError(null);
    const { error } = await supabase
      .from("trailers")
      .update({ flag_note: null })
      .eq("id",
