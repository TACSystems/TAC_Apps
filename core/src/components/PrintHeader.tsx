export default function PrintHeader({ app, title, printed }: { app: string; title: string; printed: string }) {
  return (
    <div className="print-only mb-4 border-b-2 border-black pb-2 text-black">
      <div className="flex items-baseline justify-between">
        <span className="text-lg font-bold tracking-widest">{app}</span>
        <span className="text-xs">Printed {printed}</span>
      </div>
      <div className="text-sm">{title}</div>
    </div>
  );
}
