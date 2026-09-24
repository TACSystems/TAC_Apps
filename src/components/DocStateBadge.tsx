import type { DocState } from "@/lib/documents";

export default function DocStateBadge({ state, days }: { state: DocState; days: number | null }) {
  if (state === "none") return <span className="text-xs text-neutral-500">No expiration</span>;
  const text =
    state === "expired"
      ? `Expired ${Math.abs(days ?? 0)} day${Math.abs(days ?? 0) === 1 ? "" : "s"} ago`
      : days === 0
        ? "Expires today"
        : `Expires in ${days} day${days === 1 ? "" : "s"}`;
  const cls =
    state === "expired"
      ? "border-red-800 text-red-300"
      : state === "urgent"
        ? "border-red-900 text-red-300"
        : state === "soon"
          ? "border-yellow-700 text-yellow-300"
          : "border-neutral-700 text-neutral-400";
  return <span className={`inline-block border px-2 py-0.5 text-xs ${cls}`}>{text}</span>;
}
