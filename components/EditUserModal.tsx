"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { createClient } from "@/lib/supabase/client";
import { Profile } from "@/lib/types";
import { useEffect, useState } from "react";

interface EditUserModalProps {
  user: Profile | null;
  onClose: () => void;
}

export function EditUserModal({ user, onClose }: EditUserModalProps) {
  const supabase = createClient();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name);
      setLastName(user.last_name);
      setEmployeeId(user.employee_id);
      setError(null);
    }
  }, [user]);

  if (!user) return null;

  const employeeIdValid = /^[0-9]{6,8}$/.test(employeeId);

  async function handleSave() {
    if (!employeeIdValid) {
      setError("Employee ID must be 6 to 8 digits.");
      return;
    }

    setSaving(true);
    setError(null);

    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        employee_id: employeeId,
      })
      .eq("id", user!.id);

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    onClose();
  }

  return (
    <Modal
      open={!!user}
      onClose={onClose}
      title="Edit User"
      compact
      footer={
        <>
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSave} loading={saving} className="flex-1">
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs uppercase tracking-wide text-yard-muted mb-1.5">
              First Name
            </label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full h-11 px-3.5 rounded-card bg-yard-bg border border-yard-border focus:border-amber outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-yard-muted mb-1.5">
              Last Name
            </label>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full h-11 px-3.5 rounded-card bg-yard-bg border border-yard-border focus:border-amber outline-none text-sm"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wide text-yard-muted mb-1.5">
            Employee ID (6–8 digits)
          </label>
          <input
            value={employeeId}
            inputMode="numeric"
            maxLength={8}
            onChange={(e) => setEmployeeId(e.target.value.replace(/\D/g, ""))}
            className="w-full h-11 px-3.5 rounded-card bg-yard-bg border border-yard-border font-stencil tracking-widest focus:border-amber outline-none text-sm"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wide text-yard-muted mb-1.5">
            Email
          </label>
          <input
            value={user.email}
            disabled
            className="w-full h-11 px-3.5 rounded-card bg-yard-bg/50 border border-yard-border text-yard-faint text-sm cursor-not-allowed"
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
