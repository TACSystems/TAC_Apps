"use client";

import Icon from "@core/components/Icon";

export default function PrintButton({ label = "Print / Save as PDF" }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="no-print btn btn-secondary">
      <Icon name="print" /> {label}
    </button>
  );
}
