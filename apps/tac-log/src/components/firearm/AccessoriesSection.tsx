import { money } from "@/lib/settings";
import Link from "next/link";
import { fd } from "@/lib/display";
import type { Accessory } from "@/lib/db/types";
import type { AppSettings } from "@/lib/settings-shared";

type PastMount = { id: string; from_date: string | null; to_date: string; accessory_id: string; make_model: string };

export default function AccessoriesSection({ id, settings, accessories, pastMounts }: { id: string; settings: AppSettings; accessories: Accessory[]; pastMounts: PastMount[] }) {
  return (
    <>

        
        <div className="flex flex-col gap-2">
          {accessories.map((a) => (
            <Link
              key={a.id}
              href={`/inventory/accessories/${a.id}`}
              className="border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm hover:border-neutral-600"
            >
              {a.make_model} {a.type ? `· ${a.type}` : ""}
              {a.serial_number ? <span className="text-neutral-500"> · SN {a.serial_number}</span> : null}
              {a.purchase_value != null ? (
                <span className="text-neutral-500"> · {money(a.purchase_value, settings.currencySymbol)}</span>
              ) : null}
            </Link>
          ))}
          {accessories.length === 0 && (
            <p className="text-sm text-neutral-500">No accessories linked to this firearm.</p>
          )}
        </div>
        <Link
          href={`/inventory/accessories/new?firearm_id=${id}`}
          className="mt-2 inline-block text-sm text-brand-amber hover:text-brand-amber-light"
        >
          + Add accessory
        </Link>
        {pastMounts.length > 0 && (
          <div className="mt-3 text-sm">
            <div className="mb-1 text-xs text-neutral-500">Previously mounted</div>
            {pastMounts.map((m) => (
              <div key={m.id} className="text-neutral-400">
                <Link href={`/inventory/accessories/${m.accessory_id}`} className="text-brand-amber hover:text-brand-amber-light">
                  {m.make_model}
                </Link>{" "}
                · {fd(m.from_date) || "?"} → {fd(m.to_date)}
              </div>
            ))}
          </div>
        )}
                </>
  );
}
