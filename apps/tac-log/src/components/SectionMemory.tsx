"use client";

import { useEffect } from "react";
import { saveDashboardAll, saveDashboardSection } from "@/app/dashboard-actions";
import { savePageSection, savePageSectionsAll } from "@/app/page-section-actions";

type Detail = { scope: string; ids: string[]; open: boolean; all?: boolean };

export default function SectionMemory() {
  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<Detail>).detail;
      if (!d || !Array.isArray(d.ids)) return;
      if (d.scope === "dashboard") {
        if (d.all) saveDashboardAll(d.ids, d.open);
        else if (d.ids[0]) saveDashboardSection(d.ids[0], d.open);
      } else if (d.all) savePageSectionsAll(d.scope, d.ids, d.open);
      else if (d.ids[0]) savePageSection(d.scope, d.ids[0], d.open);
    };
    window.addEventListener("taclog:section", on);
    return () => window.removeEventListener("taclog:section", on);
  }, []);
  return null;
}
