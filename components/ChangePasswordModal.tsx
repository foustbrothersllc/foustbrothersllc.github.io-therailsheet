"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

interface ChangePasswordModalProps {
  open: boolean;
  onClose: () => void;
}

export function ChangePasswordModal({ open, onClose }: ChangePasswordModalProps) {
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function handleClose() {
    setPassword("");
    setConfirmPassword("");
    setError(null);
    setDone(false);
    onClose();
  }

  const passwordsMatch = password.length > 0 && password === confirmPassword;

  async function handleSave() {
    setError(null);
    if (!passwordsMatch) {
      setError("Passwords do not match.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Change Password"
      compact
      alwaysCentered
      footer={
        !done ? (
          <>
            <Button variant="secondary" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving} className="flex-1">
              Update Password
            </Button>
          </>
        ) : (
          <Button onClick={handleClose} className="w-full">
            Done
          </Button>
        )
      }
    >
      {done ? (
        <p className="text-sm text-okay bg-okay/10 border border-okay/30 rounded-card px-3 py-3 text-center">
          Password updated.
        </p>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="block text-xs uppercase tracking-wide text-yard-muted mb-1.5">
              New Password
            </label>
            <input
              type="password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-11 px-3.5 rounded-card bg-yard-bg border border-yard-border focus:border-amber outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-yard-muted mb-1.5">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full h-11 px-3.5 rounded-card bg-yard-bg border border-yard-border focus:border-amber outline-none text-sm"
            />
            {confirmPassword.length > 0 && !passwordsMatch && (
              <p className="text-xs text-danger mt-1">Passwords do not match.</p>
            )}
          </div>
          {error && (
            <p className="text-sm text-danger bg-danger/10 border border-danger/30 rounded-card px-3 py-2">
              {error}
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
