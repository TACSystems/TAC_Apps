"use client";

import { useRef, useState } from "react";
import SubmitButton from "@/components/SubmitButton";

export const MAX_RECEIPT_MB = 24;
const ALLOWED = /\.(jpe?g|png|webp|gif|pdf)$/i;

export default function ReceiptUploadForm({ action }: { action: (formData: FormData) => void }) {
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function check(file: File | undefined) {
    if (!file) return null;
    if (!ALLOWED.test(file.name)) {
      return /\.(heic|heif)$/i.test(file.name)
        ? "iPhone HEIC photos can't be displayed here. Export or share the photo as a JPEG and upload that."
        : "Receipts must be a JPG, PNG, WEBP, GIF, or PDF file.";
    }
    if (file.size > MAX_RECEIPT_MB * 1024 * 1024) {
      return `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is ${MAX_RECEIPT_MB} MB.`;
    }
    return null;
  }

  return (
    <form
      ref={formRef}
      action={async (fd) => {
        await action(fd);
        formRef.current?.reset();
      }}
      onSubmit={(e) => {
        const input = e.currentTarget.elements.namedItem("receipt_image") as HTMLInputElement;
        const problem = check(input.files?.[0]);
        if (problem) {
          e.preventDefault();
          setError(problem);
        }
      }}
      className="flex flex-col gap-1"
    >
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="file"
          name="receipt_image"
          accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,image/jpeg,image/png,image/webp,image/gif,application/pdf"
          required
          onChange={(e) => setError(check(e.target.files?.[0]))}
          className="text-sm text-neutral-400"
        />
        <SubmitButton
          pendingLabel="Uploading…"
          className="border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm hover:bg-neutral-700"
        >
          Upload
        </SubmitButton>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <p className="text-xs text-neutral-500">JPG, PNG, WEBP, GIF, or PDF, up to {MAX_RECEIPT_MB} MB.</p>
    </form>
  );
}
