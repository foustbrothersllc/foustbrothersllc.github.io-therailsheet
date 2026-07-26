"use client";

import { AddTrailerForm } from "@/components/AddTrailerForm";
import { Modal } from "@/components/ui/Modal";

interface AddTrailerModalProps {
  open: boolean;
  onClose: () => void;
}

export function AddTrailerModal({ open, onClose }: AddTrailerModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Add Trailer">
      <AddTrailerForm onSaved={onClose} />
    </Modal>
  );
}
