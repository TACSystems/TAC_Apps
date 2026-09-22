"use client";

import { useRef, useState } from "react";
import SubmitButton from "@/components/SubmitButton";

export const MAX_ATTACHMENT_MB = 24;

export default function AttachmentUploadForm({
  action,
  imagesOnly = false,
  label = "Upload",
}: {
  action: (formData: FormData) => void | Promise<void>;
  imagesOnly?: boolean;
  label?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const allowed = imagesOnly ? /\.(jpe?g|png|webp|gif)$/i : /\.(jpe?g|png|webp|gif|pdf)$/i;
  const kinds = imagesOnly ? "JPG, PNG, WEBP, or GIF" : "JPG, PNG, WEBP, GIF, or PDF";

  function check(files: FileList | null | undefined) {
    if (!files || files.length === 0) return null;
    let total = 0;
    for (const file of Array.from(files)) {
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

  return (
    <form
      ref={formRef}
      action={async (fd) => {
        await action(fd);
        formRef.current?.reset();
      }}
      onSubmit={(e) => {
        const input = e.currentTarget.elements.namedItem("file") as HTMLInputElement;
        const problem = check(input.files);
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
          name="file"
          multiple
          accept={
            imagesOnly
              ? ".jpg,.jpeg,.png,.webp,.gif,image/jpeg,image/png,image/webp,image/gif"
              : ".jpg,.jpeg,.png,.webp,.gif,.pdf,image/jpeg,image/png,image/webp,image/gif,application/pdf"
          }
          required
          onChange={(e) => setError(check(e.target.files))}
          className="text-sm text-neutral-400"
        />
        <SubmitButton
          pendingLabel="Uploading…"
          className="border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm hover:bg-neutral-700"
        >
          {label}
        </SubmitButton>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <p className="text-xs text-neutral-500">
        {kinds}, up to {MAX_ATTACHMENT_MB} MB per upload. You can pick several files at once.
      </p>
    </form>
  );
}
