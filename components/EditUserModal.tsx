"use client";

import { ConfirmModal } from "@/components/ConfirmModal";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { createClient } from "@/lib/supabase/client";
import { Profile } from "@/lib/types";
import { Trash2, Copy, Check } from "lucide-react";
import { useEffect, useState } from "react";

interface EditUserModalProps {
  user: Profile | null;
  onClose: () => void;
}

const PROTECTED_EMAIL = "foustbrothersllc@gmail.com";

export function EditUserModal({ user, onClose }: EditUserModalProps) {
  const supabase = createClient();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailCopied, setEmailCopied] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name);
      setLastName(user.last_name);
      setEmployeeId(user.employee_id);
      setError(null);
      setConfirmingDelete(false);
      setEmailCopied(false);
    }
  }, [user]);

  if (!user) return null;

  const isProtected = user.email.toLowerCase() === PROTECTED_EMAIL;
  const employeeIdValid = /^[0-9]{6,8}$/.test(employeeId);

  function copyEmail() {
    navigator.clipboard.writeText(user.email);
    setEmailCopied(true);
    setTimeout(() => setEmailCopied(false), 2000);
  }

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

  async function handleDelete() {
    setDeleting(true);
    setError(null);

    const res = await fetch("/api/delete-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user!.id }),
    });

    setDeleting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not delete user.");
      setConfirmingDelete(false);
      return;
    }

    setConfirmingDelete(false);
    onClose();
  }



  return (
    <>
      <Modal
        open={!!user && !confirmingDelete}
        onClose={onClose}
        title="Edit User"
        compact
        headerActions={
          !isProtected ? (
            <button
              onClick={() => setConfirmingDelete(true)}
              aria-label="Delete user"
              title="Delete user"
              className="h-9 w-9 flex items-center justify-center rounded-full text-yard-muted hover:text-danger hover:bg-danger/10"
            >
              <Trash2 size={17} />
            </button>
          ) : undefined
        }
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
            <div className="flex gap-2">
              <input
                value={user.email}
                disabled
                className="flex-1 h-11 px-3.5 rounded-card bg-yard-bg/50 border border-yard-border text-yard-faint text-sm cursor-not-allowed"
              />
              <button
                onClick={copyEmail}
                className="h-11 px-3.5 rounded-card bg-amber/15 border border-amber/30 text-amber hover:bg-amber/25 transition-colors flex items-center gap-2 text-sm font-semibold"
                title="Copy email"
              >
                {emailCopied ? (
                  <Check size={16} />
                ) : (
                  <Copy size={16} />
                )}
              </button>
            </div>
          </div>
          {error && (
            <p className="text-sm text-danger bg-danger/10 border border-danger/30 rounded-card px-3 py-2">
              {error}
            </p>
          )}
        </div>
      </Modal>



      <ConfirmModal
        open={confirmingDelete}
        title="Delete User"
        message={`Remove ${user.first_name} ${user.last_name} (#${user.employee_id})? This deletes their login and can't be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={handleDelete}
      />
    </>
  );
}
