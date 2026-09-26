"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import TargetTypeEditor from "@core/components/TargetTypeEditor";
import type { TargetTypeDef, ZoneDef } from "@core/lib/cof-shared";

export default function TargetEditorPanel({
  initial,
  saveAction,
}: {
  initial?: TargetTypeDef | null;
  saveAction: (payload: {
    id?: string | null;
    name: string;
    description: string | null;
    zones: ZoneDef[];
  }) => Promise<{ error: string } | { id: string }>;
}) {
  const router = useRouter();
  const [nonce, setNonce] = useState(0);
  return (
    <TargetTypeEditor
      key={nonce}
      initial={initial}
      saveAction={saveAction}
      onSaved={() => {
        if (!initial) setNonce((n) => n + 1);
        router.refresh();
      }}
    />
  );
}
