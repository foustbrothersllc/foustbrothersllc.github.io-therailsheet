"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Trailer } from "@/lib/types";

interface BarcodeModalProps {
  trailer: Trailer | null;
  onClose: () => void;
}

export function BarcodeModal({ trailer, onClose }: BarcodeModalProps) {
  if (!trailer) return null;

  // Use tec-it barcode API to generate Code128 barcode
  const barcodeUrl = `https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(
    trailer.equipment_number
  )}&code=Code128&translate=yes`;

  return (
    <Modal
      open={!!trailer}
      onClose={onClose}
      title="Code128 Barcode"
      compact
      alwaysCentered
      footer={
        <Button onClick={onClose} className="w-full">
          Close
        </Button>
      }
    >
      <div className="flex flex-col items-center gap-4">
        <p className="text-sm text-yard-muted text-center">
          Scan this barcode with your warehouse device
        </p>
        <div className="p-4 bg-white rounded-card">
          <img
            src={barcodeUrl}
            alt="Code128 Barcode"
            style={{ height: "80px", width: "auto" }}
          />
        </div>
        <div className="bg-yard-panel border border-yard-border rounded-card p-3 w-full">
          <p className="text-xs uppercase tracking-wide text-yard-muted mb-2">
            Equipment Number:
          </p>
          <p className="font-stencil text-lg font-bold text-amber">
            {trailer.equipment_number}
          </p>
          {trailer.load_percentage !== null && (
            <p className="text-xs text-yard-faint mt-1">
              Load: {trailer.load_percentage}%
            </p>
          )}
        </div>
        <p className="text-xs text-yard-faint text-center">
          This barcode encodes: {trailer.equipment_number}
        </p>
      </div>
    </Modal>
  );
}
