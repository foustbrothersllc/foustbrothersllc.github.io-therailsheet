export default function QREntryPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <QREntryForm />
    </Suspense>
  );
}
