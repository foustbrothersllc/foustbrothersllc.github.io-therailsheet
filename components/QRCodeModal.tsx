"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Trailer } from "@/lib/types";
import { useRef } from "react";

interface QRCodeModalProps {
  trailer: Trailer | null;
  onClose: () => void;
}

export function QRCodeModal({ trailer, onClose }: QRCodeModalProps) {
  const imgRef = useRef<HTMLImageElement>(null);

  if (!trailer) return null;

  // Build URL with all trailer data
  let qrValue = `${typeof window !== "undefined" ? window.location.origin : ""}/qr-entry?trailer=${encodeURIComponent(
    trailer.equipment_number
  )}`;

  // Add load percentage if it exists
  if (trailer.load_percentage !== null && trailer.load_percentage !== undefined) {
    qrValue += `&load=${trailer.load_percentage}`;
  }

  // Add origin if it exists
  if (trailer.origin) {
    qrValue += `&origin=${encodeURIComponent(trailer.origin)}`;
  }

  // Add destination if it exists
  if (trailer.destination) {
    qrValue += `&destination=${encodeURIComponent(trailer.destination)}`;
  }

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(qrValue)}`;

  return (
    <Modal
      open={!!trailer}
      onClose={onClose}
      title="QR Code"
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
            <p className="text-xs text-yard-faint mt-1">
              Load: {trailer.load_percentage}%
            </p>
          )}
          {trailer.origin && (
            <p className="text-xs text-yard-faint">
              Origin: {trailer.origin}
            </p>
          )}
          {trailer.destination && (
            <p className="text-xs text-yard-faint">
              Destination: {trailer.destination}
            </p>
          )}
        </div>
        <p className="text-xs text-yard-faint text-center">
          Drivers can scan this QR code with their device to quickly input remaining information
        </p>
      </div>
    </Modal>
  );
}
