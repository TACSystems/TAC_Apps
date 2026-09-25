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
      className="btn btn-secondary btn-xs"
      title="Lock TAC-LOG now"
    >
      Lock
    </button>
  );
}
