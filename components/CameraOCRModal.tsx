"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Camera, Loader } from "lucide-react";
import { useRef, useState } from "react";
import Tesseract from "tesseract.js";

interface CameraOCRModalProps {
  open: boolean;
  onClose: () => void;
  onExtracted: (data: ExtractedTrailerData) => void;
}

export interface ExtractedTrailerData {
  equipment_number: string;
  pickup_number?: string;
  load_percentage?: number;
  origin?: string;
  destination?: string;
}

export function CameraOCRModal({ open, onClose, onExtracted }: CameraOCRModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [photo, setPhoto] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [extractedText, setExtractedText] = useState("");
  const [extractedData, setExtractedData] = useState<ExtractedTrailerData | null>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      alert("Could not access camera");
    }
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
        const photoData = canvasRef.current.toDataURL("image/jpeg");
        setPhoto(photoData);
        
        // Stop video stream
        const stream = videoRef.current.srcObject as MediaStream;
        stream?.getTracks().forEach((track) => track.stop());
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPhoto(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async () => {
    if (!photo) return;

    setProcessing(true);

    try {
      const result = await Tesseract.recognize(photo, "eng", {
        logger: (m) => console.log(m),
      });

      const text = result.data.text.toUpperCase();
      setExtractedText(text);

      // Parse the extracted text
      const parsed = parseTrailerData(text);
      setExtractedData(parsed);
    } catch (err) {
      alert("Error processing image: " + err);
    }

    setProcessing(false);
  };

  const parseTrailerData = (text: string): ExtractedTrailerData => {
    const data: ExtractedTrailerData = {
      equipment_number: "",
    };

    // Look for trailer/equipment number (usually looks like EMHU489025 or similar)
    const trailerMatch = text.match(/\b[A-Z]{3,4}\d{6,8}\b/);
    if (trailerMatch) {
      data.equipment_number = trailerMatch[0];
    }

    // Look for load percentage (XX%, XX %, or just XX)
    const loadMatch = text.match(/(\d{1,3})\s*%/);
    if (loadMatch) {
      const load = parseInt(loadMatch[1]);
      if (load >= 0 && load <= 100) {
        data.load_percentage = load;
      }
    }

    // Look for origin (3 letter city codes)
    const originMatch = text.match(/(?:ORIG|ORIGIN|FROM)[:\s]+([A-Z]{3})/);
    if (originMatch) {
      data.origin = originMatch[1];
    } else {
      // Try to find standalone 3-letter codes that might be origins
      const codeMatch = text.match(/\b([A-Z]{3})\b/);
      if (codeMatch) {
        data.origin = codeMatch[1];
      }
    }

    // Look for destination (3 letter city codes)
    const destMatch = text.match(/(?:DEST|DESTINATION|TO)[:\s]+([A-Z]{3})/);
    if (destMatch) {
      data.destination = destMatch[1];
    }

    // Look for pickup number
    const pickupMatch = text.match(/(?:PICKUP|PU|P\/U)[:\s#]+(\d+)/);
    if (pickupMatch) {
      data.pickup_number = pickupMatch[1];
    }

    return data;
  };

  const handleConfirm = () => {
    if (extractedData) {
      onExtracted(extractedData);
      resetModal();
    }
  };

  const resetModal = () => {
    setPhoto(null);
    setExtractedText("");
    setExtractedData(null);
    onClose();
  };

  return (
    <Modal open={open} onClose={resetModal} title="Camera OCR" compact>
      <div className="space-y-4">
        {!photo ? (
          <>
            <p className="text-sm text-yard-muted">
              Take a photo of the document to extract trailer information
            </p>

            <div className="space-y-3">
              <button
                onClick={() => {
                  startCamera();
                  setPhoto("camera");
                }}
                className="w-full flex items-center justify-center gap-2 h-12 rounded-card bg-yard-panel border border-yard-border text-yard-text hover:border-amber"
              >
                <Camera size={18} />
                Open Camera
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-12 rounded-card bg-yard-panel border border-yard-border text-yard-text hover:border-amber"
              >
                Choose Photo
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {photo === "camera" && (
              <div className="space-y-3">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full rounded-card bg-black"
                />
                <canvas ref={canvasRef} width={640} height={480} className="hidden" />
                <Button onClick={takePhoto} className="w-full">
                  Take Photo
                </Button>
              </div>
            )}
          </>
        ) : (
          <>
            {!extractedData ? (
              <>
                <img src={photo} alt="Captured" className="w-full rounded-card" />
                <Button
                  onClick={processImage}
                  loading={processing}
                  className="w-full flex items-center justify-center gap-2"
                >
                  {processing && <Loader size={16} className="animate-spin" />}
                  Extract Data with OCR
                </Button>
                <Button variant="secondary" onClick={() => setPhoto(null)} className="w-full">
                  Retake Photo
                </Button>
              </>
            ) : (
              <>
                <div className="bg-yard-panel border border-yard-border rounded-card p-4 space-y-3">
                  <div>
                    <label className="text-xs uppercase tracking-wide text-yard-muted">
                      Trailer Number
                    </label>
                    <input
                      type="text"
                      value={extractedData.equipment_number}
                      onChange={(e) =>
                        setExtractedData({ ...extractedData, equipment_number: e.target.value })
                      }
                      className="w-full mt-1 h-10 px-3 rounded bg-yard-bg border border-yard-border text-yard-text outline-none focus:border-amber"
                    />
                  </div>

                  <div>
                    <label className="text-xs uppercase tracking-wide text-yard-muted">
                      Pickup #
                    </label>
                    <input
                      type="text"
                      value={extractedData.pickup_number || ""}
                      onChange={(e) =>
                        setExtractedData({ ...extractedData, pickup_number: e.target.value })
                      }
                      className="w-full mt-1 h-10 px-3 rounded bg-yard-bg border border-yard-border text-yard-text outline-none focus:border-amber"
                    />
                  </div>

                  <div>
                    <label className="text-xs uppercase tracking-wide text-yard-muted">
                      Load %
                    </label>
                    <input
                      type="number"
                      value={extractedData.load_percentage || ""}
                      onChange={(e) =>
                        setExtractedData({
                          ...extractedData,
                          load_percentage: e.target.value ? parseInt(e.target.value) : undefined,
                        })
                      }
                      className="w-full mt-1 h-10 px-3 rounded bg-yard-bg border border-yard-border text-yard-text outline-none focus:border-amber"
                    />
                  </div>

                  <div>
                    <label className="text-xs uppercase tracking-wide text-yard-muted">Origin</label>
                    <input
                      type="text"
                      value={extractedData.origin || ""}
                      onChange={(e) =>
                        setExtractedData({
                          ...extractedData,
                          origin: e.target.value.toUpperCase(),
                        })
                      }
                      className="w-full mt-1 h-10 px-3 rounded bg-yard-bg border border-yard-border text-yard-text outline-none focus:border-amber"
                    />
                  </div>

                  <div>
                    <label className="text-xs uppercase tracking-wide text-yard-muted">
                      Destination
                    </label>
                    <input
                      type="text"
                      value={extractedData.destination || ""}
                      onChange={(e) =>
                        setExtractedData({
                          ...extractedData,
                          destination: e.target.value.toUpperCase(),
                        })
                      }
                      className="w-full mt-1 h-10 px-3 rounded bg-yard-bg border border-yard-border text-yard-text outline-none focus:border-amber"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="secondary" onClick={() => setPhoto(null)} className="flex-1">
                    Retake
                  </Button>
                  <Button onClick={handleConfirm} className="flex-1">
                    Use This Data
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
