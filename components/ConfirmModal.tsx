"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: React.ReactNode;
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
      titleClassName="text-2xl"
      compact
      alwaysCentered
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} className="flex-1" size="lg">
            No, Cancel
          </Button>
          <Button variant={variant} onClick={onConfirm} loading={loading} className="flex-1" size="lg">
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-xl leading-relaxed text-yard-text">{message}</div>
    </Modal>
  );
}
