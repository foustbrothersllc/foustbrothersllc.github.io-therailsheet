"use client";

import { ConfirmModal } from "@/components/ConfirmModal";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { createClient } from "@/lib/supabase/client";
import { Profile, Trailer } from "@/lib/types";
import { Tag } from "lucide-react";
import { useState } from "react";

interface TrailerDetailModalProps {
  trailer: Trailer | null;
  profile: Profile;
  onClose: () => void;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-yard-border last:border-b-0">
      <span className="text-sm uppercase tracking-wide text-yard-muted">{label}</span>
      <span className="text-lg font-semibold text-yard-text text-right">{value}</span>
    </div>
  );
}

export function TrailerDetailModal({ trailer, profile, onClose }: TrailerDetailModalProps) {
  const supabase = createClient();
  const [confirming, setConfirming] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!trailer) return null;

  const canAccept = trailer.status === "at_rail";

  async function handleAccept() {
    if (!trailer) return;
    setAccepting(true);
    setError(null);

    const { error } = await supabase
      .from("trailers")
      .update({
        status: "departed",
        assigned_to_id: profile.id,
        assigned_driver_name: `${profile.first_name} ${profile.last_name}`,
        assigned_driver_emp_id: profile.employee_id,
      })
      .eq("id", trailer.id)
      .eq("status", "at_rail"); // guards against a race with another driver

    setAccepting(false);

    if (error) {
      setError("Could not accept — it may have just been taken by someone else.");
      return;
    }

    setConfirming(false);
    onClose();
  }

  return (
    <>
      <Modal
        open={!!trailer && !confirming}
        onClose={onClose}
        title={trailer.equipment_number}
        titleClassName="text-4xl"
        footer={
          canAccept ? (
            <Button className="w-full" onClick={() => setConfirming(true)}>
              Accept Trailer
            </Button>
          ) : undefined
        }
      >
        <div>
          {trailer.flag_note && (
            <div className="bg-danger/10 border border-danger/30 rounded-card px-3 py-2.5 mb-4">
              <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-danger mb-1">
                <Tag size={12} />
                Redtag
              </p>
              <p className="text-sm text-yard-text">{trailer.flag_note}</p>
            </div>
          )}
          <DetailRow label="Pickup #" value={trailer.pickup_number} />
          {trailer.origin && <DetailRow label="Origin" value={trailer.origin} />}
          {trailer.origin_sort_type && (
            <DetailRow label="Origin Sort" value={trailer.origin_sort_type} />
          )}
          {trailer.destination && <DetailRow label="Destination" value={trailer.destination} />}
          {trailer.destination_sort_type && (
            <DetailRow label="Destination Sort" value={trailer.destination_sort_type} />
          )}
          {trailer.load_percentage != null && (
            <DetailRow label="Load %" value={`${trailer.load_percentage}%`} />
          )}
          {trailer.status === "departed" && trailer.assigned_driver_name && (
            <DetailRow label="Driver" value={trailer.assigned_driver_name} />
          )}
        </div>
        {error && (
          <p className="text-sm text-danger bg-danger/10 border border-danger/30 rounded-card px-3 py-2 mt-3">
            {error}
          </p>
        )}
      </Modal>

      <ConfirmModal
        open={confirming}
        title="Confirm"
        message={
          <div className="text-center">
            <p>You are taking trailer</p>
            <p className="text-3xl font-stencil font-bold text-amber mt-1.5 tracking-wider">
              {trailer.equipment_number}
            </p>
          </div>
        }
        onCancel={() => setConfirming(false)}
        onConfirm={handleAccept}
        loading={accepting}
      />
    </>
  );
}
