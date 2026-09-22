const STYLES: Record<string, string> = {
  active: "border-green-700 text-green-400",
  stored: "border-yellow-700 text-yellow-400",
  inactive: "border-yellow-700 text-yellow-400",
  sold: "border-red-800 text-red-400",
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block border px-2 py-0.5 text-xs uppercase tracking-widest ${
        STYLES[status] ?? "border-neutral-700 text-neutral-400"
      }`}
    >
      {status}
    </span>
  );
}
