"use client";

import { useState, useTransition } from "react";
import FileDrop from "@/components/FileDrop";

export const MAX_ATTACHMENT_MB = 24;

export default function AttachmentUploadForm({
  action,
  imagesOnly = false,
}: {
  action: (formData: FormData) => void | Promise<void>;
  imagesOnly?: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const allowed = imagesOnly ? /\.(jpe?g|png|webp|gif)$/i : /\.(jpe?g|png|webp|gif|pdf)$/i;
  const kinds = imagesOnly ? "JPG, PNG, WEBP, or GIF" : "JPG, PNG, WEBP, GIF, or PDF";

  function check(files: File[]) {
    let total = 0;
    for (const file of files) {
      if (!allowed.test(file.name)) {
        return /\.(heic|heif)$/i.test(file.name)
          ? "iPhone HEIC photos can't be displayed here. Export or share the photo as a JPEG and upload that."
          : `"${file.name}" isn't supported. Use ${kinds} files.`;
      }
      total += file.size;
    }
    if (total > MAX_ATTACHMENT_MB * 1024 * 1024) {
      return `Those files add up to ${(total / 1024 / 1024).toFixed(1)} MB. The limit per upload is ${MAX_ATTACHMENT_MB} MB.`;
    }
    return null;
  }

  function upload(files: File[]) {
    setDone(null);
    const problem = check(files);
    setError(problem);
    if (problem) return;
    const fd = new FormData();
    files.forEach((f) => fd.append("file", f));
    const what = `${files.length} ${files.length === 1 ? "file" : "files"}`;
    setBusy(`Uploading ${what}…`);
    startTransition(async () => {
      try {
        await action(fd);
        setDone(`✓ Uploaded ${what}.`);
      } catch {
        setError("Upload failed. Try again.");
      } finally {
        setBusy(null);
      }
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <FileDrop
        multiple
        accept={
          imagesOnly
            ? ".jpg,.jpeg,.png,.webp,.gif,image/jpeg,image/png,image/webp,image/gif"
            : ".jpg,.jpeg,.png,.webp,.gif,.pdf,image/jpeg,image/png,image/webp,image/gif,application/pdf"
        }
        label={imagesOnly ? "Select Images" : "Select Files"}
        prompt={imagesOnly ? "Drag photos here," : "Drag files here,"}
        pasteImages
        showSelected={false}
        busyText={busy}
        disabled={Boolean(busy)}
        hint={`${kinds}, up to ${MAX_ATTACHMENT_MB} MB per upload. Several at once is fine.`}
        onFiles={upload}
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
      {done && !error && <p className="text-sm text-green-400">{done}</p>}
    </div>
  );
}
