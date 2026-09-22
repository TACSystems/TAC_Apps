"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { lockNow } from "@/app/lock/actions";

export default function LockButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await lockNow();
          router.refresh();
        })
      }
      className="border border-neutral-700 px-2 py-0.5 text-xs text-neutral-400 hover:text-neutral-100"
      title="Lock TAC-LOG now"
    >
      Lock
    </button>
  );
}
