"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ImportCofForm() {
  const [status, setStatus] = useState<{ type: "ok" | "error"; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fileInput = form.elements.namedItem("file") as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (!file) {
      setStatus({ type: "error", message: "Choose a file first." });
      return;
    }

    setLoading(true);
    setStatus(null);

    const body = new FormData();
    body.append("file", file);

    try {
      const res = await fetch("/api/courses/import", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) {
        setStatus({ type: "error", message: data.error ?? "Import failed" });
      } else {
        setStatus({
          type: "ok",
          message: `Imported ${data.coursesUpserted} course${data.coursesUpserted === 1 ? "" : "s"}.`,
        });
        router.refresh();
      }
    } catch {
      setStatus({ type: "error", message: "Import failed — could not reach the app." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input
        type="file"
        name="file"
        accept="application/json,.json"
        className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={loading}
        className="w-fit rounded bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500 disabled:opacity-50"
      >
        {loading ? "Importing…" : "Import"}
      </button>
      {status && (
        <p className={status.type === "ok" ? "text-sm text-green-400" : "text-sm text-red-400"}>
          {status.message}
        </p>
      )}
    </form>
  );
}
