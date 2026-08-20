"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Trailer } from "@/lib/types";
import { Download } from "lucide-react";
import { useRef } from "react";

interface QRCodeModalProps {
  trailer: Trailer | null;
  onClose: () => void;
}

export function QRCodeModal({ trailer, onClose }: QRCodeModalProps) {
  const imgRef = useRef<HTMLImageElement>(null);

  if (!trailer) return null;

  // Build URL with trailer number and load percentage if available
  let qrValue = `${typeof window !== "undefined" ? window.location.origin : ""}/qr-entry?trailer=${encodeURIComponent(
    trailer.equipment_number
  )}`;

  // Add load percentage if it exists
  if (trailer.load_percentage !== null && trailer.load_percentage !== undefined) {
    qrValue += `&load=${trailer.load_percentage}`;
  }

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(qrValue)}`;

  const downloadQR = () => {
    if (imgRef.current) {
      const link = document.createElement("a");
      link.download = `${trailer.equipment_number}-qr.png`;
      link.href = qrImageUrl;
      link.click();
    }
  };

  return (
    <Modal
      open={!!trailer}
      onClose={onClose}
      title="QR Code"
      compact
      alwaysCentered
      footer={
        <>
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Close
          </Button>
          <Button onClick={downloadQR} className="flex-1">
            <Download size={16} />
            Download
          </Button>
        </>
      }
    >
      <div className="flex flex-col items-center gap-4">
        <p className="text-sm text-yard-muted text-center">
          Scan this code to quickly enter trailer details
        </p>
        <div className="p-4 bg-white rounded-card">
          <img
            ref={imgRef}
            src={qrImageUrl}
            alt="QR Code"
            className="w-64 h-64"
          />
        </div>
        <div className="bg-yard-panel border border-yard-border rounded-card p-3 w-full">
          <p className="text-xs uppercase tracking-wide text-yard-muted mb-2">Trailer:</p>
          <p className="font-stencil text-lg font-bold text-amber">
            {trailer.equipment_number}
          </p>
          {trailer.load_percentage !== null && (
            <p className="text-xs text-yard-faint mt-2">
              Load: {trailer.load_percentage}%
            </p>
          )}
        </div>
        <p className="text-xs text-yard-faint text-center">
          Drivers can scan this QR code with their device to quickly input destination and load information
        </p>
      </div>
    </Modal>
  );
}
