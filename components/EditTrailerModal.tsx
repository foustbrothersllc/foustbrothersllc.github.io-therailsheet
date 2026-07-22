"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { createClient } from "@/lib/supabase/client";
import { Trailer } from "@/lib/types";
import { standardizeEquipmentNumber } from "@/lib/utils";
import { useEffect, useState } from "react";

interface EditTrailerModalProps {
  trailer: Trailer | null;
  onClose: () => void;
}

const emptyForm = {
  equipment_number: "",
  pickup_number: "",
  origin: "",
  destination: "",
  sort_type: "",
  load_percentage: "",
};

export function EditTrailerModal({ trailer, onClose }: EditTrailerModalProps) {
  const supabase = createClient();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (trailer) {
      setForm({
        equipment_number: trailer.equipment_number,
        pickup_number: trailer.pickup_number,
        origin: trailer.origin,
        destination: trailer.destination,
        sort_type: trailer.sort_type,
        load_percentage: trailer.load_percentage?.toString() ?? "",
      });
      setError(null);
    }
  }, [trailer]);

  if (!trailer) return null;

  async function handleSave() {
    setSaving(true);
    setError(null);

    const { error } = await supabase
      .from("trailers")
      .update({
        equipment_number: standardizeEquipmentNumber(form.equipment_number),
        pickup_number: form.pickup_number.trim(),
        origin: form.origin.trim(),
        destination: form.destination.trim(),
        sort_type: form.sort_type.trim(),
        load_percentage: form.load_percentage ? Number(form.load_percentage) : null,
      })
      .eq("id", trailer!.id);

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    onClose();
  }

  const field = (key: keyof typeof form, label: string, numeric = false) => (
    <div>
      <label className="block text-xs uppercase tracking-wide text-yard-muted mb-1.5">
        {label}
      </label>
      <input
        value={form[key]}
        inputMode={numeric ? "numeric" : undefined}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        className="w-full h-11 px-3.5 rounded-card bg-yard-bg border border-yard-border focus:border-amber outline-none text-sm"
      />
    </div>
  );

  return (
    <Modal
      open={!!trailer}
      onClose={onClose}
      title="Edit Trailer"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSave} loading={saving} className="flex-1">
            Save Changes
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {field("equipment_number", "Equipment Number")}
        {field("pickup_number", "Pickup #")}
        {field("origin", "Origin")}
        {field("destination", "Destination")}
        {field("sort_type", "Sort Type")}
        {field("load_percentage", "Load %", true)}
        {error && (
          <p className="text-sm text-danger bg-danger/10 border border-danger/30 rounded-card px-3 py-2">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
