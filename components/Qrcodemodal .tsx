"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Trailer } from "@/lib/types";
import { QRCodeSVG } from "qrcode.react";
import { useRef } from "react";

interface QRCodeModalProps {
  trailer: Trailer | null;
  onClose: () => void;
}

export function QRCodeModal({ trailer, onClose }: QRCodeModalProps) {
  const qrRef = useRef<HTMLDivElement>(null);

  if (!trailer) return null;

  const qrValue = `${typeof window !== "undefined" ? window.location.origin : ""}/qr-entry?trailer=${encodeURIComponent(
    trailer.equipment_number
  )}`;

  const downloadQR = () => {
    const canvas = qrRef.current?.querySelector("canvas");
    if (canvas) {
      const link = document.createElement("a");
      link.download = `${trailer.equipment_number}-qr.png`;
      link.href = canvas.toDataURL();
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
            Download
          </Button>
        </>
      }
    >
      <div className="flex flex-col items-center gap-4">
        <p className="text-sm text-yard-muted text-center">
          Scan this code to quickly enter trailer details
        </p>
        <div
          ref={qrRef}
          className="p-4 bg-white rounded-card"
        >
          <QRCodeSVG
            value={qrValue}
            size={256}
            level="H"
            includeMargin={true}
            fgColor="#0E1114"
            bgColor="#FFFFFF"
          />
        </div>
        <div className="bg-yard-panel border border-yard-border rounded-card p-3 w-full">
          <p className="text-xs uppercase tracking-wide text-yard-muted mb-2">Trailer:</p>
          <p className="font-stencil text-lg font-bold text-amber">
            {trailer.equipment_number}
          </p>
        </div>
        <p className="text-xs text-yard-faint text-center">
          Drivers can scan this QR code with their device to quickly input destination and load information
        </p>
      </div>
    </Modal>
  );
}
