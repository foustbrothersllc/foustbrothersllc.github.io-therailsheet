"use client";

import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { standardizeEquipmentNumber, upper } from "@/lib/utils";
import { useState } from "react";

const empty = {
  equipment_number: "",
  pickup_number: "",
  origin: "",
  origin_sort_type: "",
  destination: "",
  destination_sort_type: "",
  load_percentage: "",
};

export function AddTrailerForm() {
  const supabase = createClient();
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const { error } = await supabase.from("trailers").insert({
      equipment_number: standardizeEquipmentNumber(form.equipment_number),
      pickup_number: form.pickup_number.trim(),
      origin: form.origin.trim() || null,
      origin_sort_type: form.origin_sort_type.trim() || null,
      destination: form.destination.trim() || null,
      destination_sort_type: form.destination_sort_type.trim() || null,
      load_percentage: form.load_percentage ? Number(form.load_percentage) : null,
      status: "at_rail",
    });

    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }
    setForm(empty);
  }

  const field = (
    key: keyof typeof form,
    label: string,
    { required = false, numeric = false }: { required?: boolean; numeric?: boolean } = {}
  ) => (
    <div>
      <label className="block text-xs uppercase tracking-wide text-yard-muted mb-1.5">
        {label}
      </label>
      <input
        value={form[key]}
        required={required}
        inputMode={numeric ? "numeric" : undefined}
        onChange={(e) =>
          setForm((f) => ({
            ...f,
            [key]: numeric ? e.target.value : upper(e.target.value),
          }))
        }
        className="w-full h-11 px-3.5 rounded-card bg-yard-bg border border-yard-border focus:border-amber outline-none text-sm"
      />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {field("equipment_number", "Equipment Number", { required: true })}
        {field("pickup_number", "Pickup #", { required: true })}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {field("origin", "Origin")}
        {field("origin_sort_type", "Origin Sort")}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {field("destination", "Destination")}
        {field("destination_sort_type", "Destination Sort")}
      </div>
      {field("load_percentage", "Load %", { numeric: true })}
      {error && (
        <p className="text-sm text-danger bg-danger/10 border border-danger/30 rounded-card px-3 py-2">
          {error}
        </p>
      )}
      <Button type="submit" loading={saving} className="w-full">
        Add Trailer
      </Button>
    </form>
  );
}
