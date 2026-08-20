import { Suspense } from "react";
import QREntryFormClient from "./qr-entry-form";

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-yard-bg">
      <div className="text-center">
        <div className="h-8 w-8 rounded-full border-2 border-amber border-t-transparent animate-spin mx-auto mb-4" />
        <p className="text-yard-muted">Loading...</p>
      </div>
    </div>
  );
}

export default function QREntryPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <QREntryFormClient />
    </Suspense>
  );
}
