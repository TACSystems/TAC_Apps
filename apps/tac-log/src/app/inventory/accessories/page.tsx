import Link from "next/link";
import { getDb } from "@/lib/db";
import type { Accessory } from "@/lib/db/types";

export const dynamic = "force-dynamic";
import { deleteAccessory } from "@/app/inventory/actions";
import ConfirmSubmitButton from "@core/components/ConfirmSubmitButton";
import ClickRow from "@core/components/ClickRow";
import EmptyState from "@core/components/EmptyState";

export default async function AccessoriesPage() {
  const db = getDb();
  const accessories = db
    .prepare(
      `select a.*, firearm_label(f.make_model, f.nickname) as firearm_make_model
       from accessories a
       left join firearms f on f.id = a.firearm_id
       order by a.date_of_entry desc`
    )
    .all() as (Accessory & { firearm_make_model: string | null })[];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Serialized Accessories</h1>
        <Link
          href="/inventory/accessories/new"
          className="rounded bg-brand-olive px-3 py-2 text-sm font-medium hover:bg-brand-olive-light"
        >
          + Add Accessory
        </Link>
      </div>

      <div className="flex flex-col gap-2">
        {accessories.map((a) => (
          <ClickRow
            key={a.id}
            as="div"
            href={`/inventory/accessories/${a.id}`}
            className="flex items-center justify-between border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm hover:border-neutral-600"
          >
            <div>
              <Link href={`/inventory/accessories/${a.id}`} className="font-medium text-brand-amber hover:text-brand-amber-light">
                {a.make_model}
              </Link>
              <div className="text-neutral-400">
                {a.type} {a.serial_number ? `· SN ${a.serial_number}` : ""}{" "}
                {a.firearm_make_model ? `· mounted on ${a.firearm_make_model}` : "· not mounted"}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link href={`/inventory/accessories/${a.id}`} className="text-brand-amber hover:text-brand-amber-light">
                Edit
              </Link>
              <form action={deleteAccessory.bind(null, a.id)}>
                <ConfirmSubmitButton
                  confirmMessage={`Delete accessory "${a.make_model}"? Its receipts, photos, and mount history are removed too.`}
                  className="text-red-400 hover:text-red-300"
                >
                  Delete
                </ConfirmSubmitButton>
              </form>
            </div>
          </ClickRow>
        ))}
        {accessories.length === 0 && (
          <EmptyState
            title="No accessories yet"
            actions={[
              { href: "/inventory/accessories/new", label: "+ Add Accessory", primary: true },
              { href: "/settings#settings-import-export", label: "Import Spreadsheet" },
            ]}
          >
            Optics, lights, suppressors, and other gear, with serials, receipts, and which firearm they are mounted on.
          </EmptyState>
        )}
      </div>
    </div>
  );
}
