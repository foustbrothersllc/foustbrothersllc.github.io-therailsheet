"use client";

import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { standardizeEquipmentNumber } from "@/lib/utils";
import { useSearchParams } from "next/navigation";
import { useRef, useState } from "react";

export default function QREntryFormClient() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const trailerNumber = searchParams.get("trailer") || "";
  const loadFromUrl = searchParams.get("load") || "";

  const [equipment_number, setEquipment_number] = useState(trailerNumber);
  const [pickup_number, setPickup_number] = useState("");
  const [load_percentage, setLoad_percentage] = useState(loadFromUrl || "100");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const equipmentRef = useRef<HTMLInputElement>(null);
  const pickupRef = useRef<HTMLInputElement>(null);
  const loadRef = useRef<HTMLInputElement>(null);
  const originRef = useRef<HTMLInputElement>(null);
  const destRef = useRef<HTMLInputElement>(null);

  const handleEquipmentKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      pickupRef.current?.focus();
    }
  };

  const handlePickupKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      loadRef.current?.focus();
    }
  };

  const handleLoadKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      originRef.current?.focus();
    }
  };

  const handleOriginKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      destRef.current?.focus();
    }
  };

  const handleDestKey = async (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      await handleSubmit();
    }
  };

  async function handleSubmit() {
    setError(null);

    if (!equipment_number.trim()) {
      setError("Trailer number is required");
      return;
    }

    const cleanedNumber = standardizeEquipmentNumber(equipment_number);
    const loadPct = load_percentage ? Number(load_percentage) : 100;

    if (isNaN(loadPct) || loadPct < 0 || loadPct > 100) {
      setError("Load percentage must be between 0 and 100");
      return;
    }

    setLoading(true);

    // Upsert - will create if new, update if exists
    const { error: err } = await supabase.from("trailers").upsert(
      {
        equipment_number: cleanedNumber,
        pickup_number: pickup_number.trim() || null,
        load_percentage: loadPct,
        origin: origin.trim() || null,
        destination: destination.trim() || null,
        status: "at_rail",
      },
      { onConflict: "equipment_number", ignoreDuplicates: false }
    );

    setLoading(false);

    if (err) {
      setError(err.message);
      return;
    }

    setSuccess(true);
    setTimeout(() => {
      window.location.href = "/dashboard";
    }, 1500);
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <div className="mb-6">
            <span className="h-2 w-8 bg-okay rounded-full inline-block" />
          </div>
          <h1 className="font-display text-3xl uppercase tracking-wide mb-3">Saved!</h1>
          <p className="text-yard-muted text-sm mb-6">
            Trailer {equipment_number} has been updated and added to the board.
          </p>
          <div className="h-8 w-8 rounded-full border-2 border-okay border-t-transparent animate-spin mx-auto" />
          <p className="text-xs text-yard-faint mt-4">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-yard-bg">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="h-2 w-8 bg-amber rounded-full" />
            <span className="font-stencil text-xs tracking-[0.3em] text-yard-muted uppercase">
              Rail Sheet
            </span>
          </div>
          <h1 className="font-display text-2xl uppercase tracking-wide">Quick Entry</h1>
          <p className="text-xs text-yard-muted mt-2">Optimized for barcode scanners</p>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-yard-muted mb-1.5 uppercase tracking-wide">
              Trailer Number
            </label>
            <input
              ref={equipmentRef}
              autoFocus
              type="text"
              required
              value={equipment_number}
              onChange={(e) => setEquipment_number(e.target.value)}
              onKeyDown={handleEquipmentKey}
              placeholder="e.g., EMHU489025"
              className="w-full h-12 px-4 rounded-card bg-yard-panel border border-yard-border text-yard-text focus:border-amber outline-none font-stencil text-lg tracking-wider"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-yard-muted mb-1.5 uppercase tracking-wide">
              Pickup # (optional)
            </label>
            <input
              ref={pickupRef}
              type="text"
              value={pickup_number}
              onChange={(e) => setPickup_number(e.target.value)}
              onKeyDown={handlePickupKey}
              placeholder="Press Enter to skip"
              className="w-full h-12 px-4 rounded-card bg-yard-panel border border-yard-border text-yard-text focus:border-amber outline-none text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-yard-muted mb-1.5 uppercase tracking-wide">
              Load % {loadFromUrl && `(provided: ${loadFromUrl}%)`}
            </label>
            <input
              ref={loadRef}
              type="number"
              inputMode="numeric"
              min="0"
              max="100"
              value={load_percentage}
              onChange={(e) => setLoad_percentage(e.target.value)}
              onKeyDown={handleLoadKey}
              placeholder="100"
              className="w-full h-12 px-4 rounded-card bg-yard-panel border border-yard-border text-yard-text focus:border-amber outline-none text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-yard-muted mb-1.5 uppercase tracking-wide">
              Origin (optional)
            </label>
            <input
              ref={originRef}
              type="text"
              value={origin}
              onChange={(e) => setOrigin(e.target.value.toUpperCase())}
              onKeyDown={handleOriginKey}
              placeholder="e.g., CHI, LAX"
              className="w-full h-12 px-4 rounded-card bg-yard-panel border border-yard-border text-yard-text focus:border-amber outline-none text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-yard-muted mb-1.5 uppercase tracking-wide">
              Destination (optional)
            </label>
            <input
              ref={destRef}
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value.toUpperCase())}
              onKeyDown={handleDestKey}
              placeholder="e.g., NYC, MIA"
              className="w-full h-12 px-4 rounded-card bg-yard-panel border border-yard-border text-yard-text focus:border-amber outline-none text-sm"
            />
          </div>

          {error && (
            <p className="text-sm text-danger bg-danger/10 border border-danger/30 rounded-card px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="flex-1"
              onClick={() => (window.location.href = "/dashboard")}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="lg"
              className="flex-1"
              loading={loading}
              onClick={handleSubmit}
            >
              Save
            </Button>
          </div>
        </form>

        <p className="text-xs text-yard-faint text-center mt-6">
          Press Enter to move between fields or scan with a barcode scanner
        </p>
      </div>
    </div>
  );
}
