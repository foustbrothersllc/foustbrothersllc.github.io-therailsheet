"use client";

import { ConfirmModal } from "@/components/ConfirmModal";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { createClient } from "@/lib/supabase/client";
import { Profile, Trailer } from "@/lib/types";
import { useState } from "react";

interface TrailerDetailModalProps {
  trailer: Trailer | null;
  profile: Profile;
  onClose: () => void;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-yard-border last:border-b-0">
      <span className="text-xs uppercase tracking-wide text-yard-muted">{label}</span>
      <span className="text-sm font-medium text-yard-text text-right">{value}</span>
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
        footer={
          canAccept ? (
            <Button className="w-full" onClick={() => setConfirming(true)}>
              Accept Trailer
            </Button>
          ) : undefined
        }
      >
        <div>
          <DetailRow label="Pickup #" value={trailer.pickup_number} />
          <DetailRow label="Origin" value={trailer.origin} />
          <DetailRow label="Destination" value={trailer.destination} />
          <DetailRow label="Sort Type" value={trailer.sort_type} />
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
        message={`Are you sure you want to take Trailer ${trailer.equipment_number}?`}
        onCancel={() => setConfirming(false)}
        onConfirm={handleAccept}
        loading={accepting}
      />
    </>
  );
}
