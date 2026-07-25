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
      .eq("id", trailer!.id);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setNote("");
    onClose();
  }

  return (
    <Modal
      open={!!trailer}
      onClose={onClose}
      title="Redtag Trailer"
      compact
      alwaysCentered
      footer={
        <>
          {trailer.flag_note && (
            <Button variant="secondary" onClick={handleClear} loading={saving} className="flex-1">
              Clear Redtag
            </Button>
          )}
          <Button variant="danger" onClick={handleSave} loading={saving} className="flex-1">
            Save Redtag
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="block text-xs uppercase tracking-wide text-yard-muted mb-1.5">
            What's wrong with this trailer?
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value.toUpperCase())}
            rows={4}
            className="w-full px-3.5 py-3 rounded-card bg-yard-bg border border-yard-border focus:border-danger outline-none text-sm resize-none"
          />
        </div>
        {error && (
          <p className="text-sm text-danger bg-danger/10 border border-danger/30 rounded-card px-3 py-2">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
