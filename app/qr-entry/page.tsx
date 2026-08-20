export default function QREntryPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <QREntryForm />
    </Suspense>
 import { Suspense, useRef, useState } from "react";
}
