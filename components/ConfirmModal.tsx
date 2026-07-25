"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: "primary" | "danger";
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Yes, Confirm",
  variant = "primary",
  loading = false,
  onCancel,
  onConfirm,
}: ConfirmModalProps) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      compact
      alwaysCentered
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} className="flex-1">
            No, Cancel
          </Button>
          <Button variant={variant} onClick={onConfirm} loading={loading} className="flex-1">
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-yard-muted">{message}</p>
    </Modal>
  );
}
