"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { FlagTrailerModal } from "@/components/FlagTrailerModal";
import { createClient } from "@/lib/supabase/client";
import { Trailer } from "@/lib/types";
import { standardizeEquipmentNumber, upper, cn } from "@/lib/utils";
import { Flame, Tag } from "lucide-react";
import { useEffect, useState } from "react";

interface EditTrailerModalProps {
  trailer: Trailer | null;
  onClose: () => void;
}

const emptyForm = {
  equipment_number: "",
  pickup_number: "",
  origin: "",
  origin_sort_type: "",
  destination: "",
  destination_sort_type: "",
  load_percentage: "",
};

export function EditTrailerModal({ trailer, onClose }: EditTrailerModalProps) {
  const supabase = createClient();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flagging, setFlagging] = useState(false);
  const [togglingHot, setTogglingHot] = useState(false);

  useEffect(() => {
    if (trailer) {
      setForm({
        equipment_number: trailer.equipment_number,
        pickup_number: trailer.pickup_number,
        origin: trailer.origin ?? "",
        origin_sort_type: trailer.origin_sort_type ?? "",
        destination: trailer.destination ?? "",
        destination_sort_type: trailer.destination_sort_type ?? "",
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
        origin: form.origin.trim() || null,
        origin_sort_type: form.origin_sort_type.trim() || null,
        destination: form.destination.trim() || null,
        destination_sort_type: form.destination_sort_type.trim() || null,
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

  async function handleToggleHot() {
    if (!trailer) return;
    setTogglingHot(true);
    await supabase
      .from("trailers")
      .update({ is_hot: !trailer.is_hot })
      .eq("id", trailer.id);
    setTogglingHot(false);
  }

  const field = (key: keyof typeof form, label: string, numeric = false) => (
    <div>
      <label className="block text-xs uppercase tracking-wide text-yard-muted mb-1.5">
        {label}
      </label>
      <input
        value={form[key]}
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
    <>
      <Modal
        open={!!trailer && !flagging}
        onClose={onClose}
        title="Edit Trailer"
        headerActions={
          <>
            <button
              onClick={handleToggleHot}
              disabled={togglingHot}
              aria-label="Mark HOT"
              title="Mark HOT — needs to come back ASAP"
              className={cn(
                "h-9 w-9 flex items-center justify-center rounded-full transition-colors disabled:opacity-50",
                trailer.is_hot
                  ? "text-hot bg-hot/15 hover:bg-hot/25"
                  : "text-yard-muted hover:text-hot hover:bg-hot/10"
              )}
            >
              <Flame size={17} />
            </button>
            <button
              onClick={() => setFlagging(true)}
              aria-label="Redtag trailer"
              title="Redtag trailer"
              className={cn(
                "h-9 w-9 flex items-center justify-center rounded-full transition-colors",
                trailer.flag_note
                  ? "text-danger bg-danger/15 hover:bg-danger/25"
                  : "text-yard-muted hover:text-danger hover:bg-danger/10"
              )}
            >
              <Tag size={17} />
            </button>
          </>
        }
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
          {trailer.is_hot && (
            <div className="bg-hot/10 border border-hot/30 rounded-card px-3 py-2.5 flex items-center gap-2">
              <Flame size={14} className="text-hot shrink-0" />
              <p className="text-xs uppercase tracking-wide text-hot font-semibold">
                Hot — needs to come back ASAP
              </p>
            </div>
          )}
          {trailer.flag_note && (
            <div className="bg-danger/10 border border-danger/30 rounded-card px-3 py-2.5">
              <p className="text-xs uppercase tracking-wide text-danger mb-1">Redtag</p>
              <p className="text-sm text-yard-text">{trailer.flag_note}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            {field("equipment_number", "Equipment Number")}
            {field("pickup_number", "Pickup #")}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {field("origin", "Origin")}
            {field("origin_sort_type", "Origin Sort")}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {field("destination", "Destination")}
            {field("destination_sort_type", "Destination Sort")}
          </div>
          {field("load_percentage", "Load %", true)}
          {error && (
            <p className="text-sm text-danger bg-danger/10 border border-danger/30 rounded-card px-3 py-2">
              {error}
            </p>
          )}
        </div>
      </Modal>

      <FlagTrailerModal trailer={flagging ? trailer : null} onClose={() => setFlagging(false)} />
    </>
  );
}
