import Icon from "@core/components/Icon";
import PageHeader from "@core/components/PageHeader";
import Link from "next/link";
import { getDb } from "@/lib/db";
import type { Accessory } from "@/lib/db/types";

export const dynamic = "force-dynamic";
import { deleteAccessory } from "@/app/inventory/actions";
import ConfirmSubmitButton from "@core/components/ConfirmSubmitButton";
import DataTable from "@core/components/DataTable";
import { getSettings, money } from "@/lib/settings";
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
  const currency = getSettings(db).currencySymbol;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Serialized Accessories"
        back={{ href: "/inventory", label: "Armory" }}
        actions={
          <Link href="/inventory/accessories/new" className="btn btn-primary">
            <Icon name="plus" /> Add Accessory
          </Link>
        }
      />

      {accessories.length === 0 ? (
        <EmptyState
          title="No accessories yet"
          actions={[
            { href: "/inventory/accessories/new", label: "+ Add Accessory", primary: true },
            { href: "/settings#settings-import-export", label: "Import Spreadsheet" },
          ]}
        >
          Optics, lights, suppressors, and other gear, with serials, receipts, and which firearm they are mounted on.
        </EmptyState>
      ) : (
        <DataTable
          filterPlaceholder="Filter by make/model, type, serial, or firearm…"
          initialSort={{ key: "name", dir: "asc" }}
          columns={[
            { key: "name", label: "Accessory", sortable: true },
            { key: "type", label: "Type", sortable: true },
            { key: "serial", label: "Serial #", sortable: true },
            { key: "mounted", label: "Mounted On", sortable: true },
            { key: "value", label: "Value", align: "right", sortable: true },
            { key: "actions", label: "" },
          ]}
          rows={accessories.map((a) => ({
            key: a.id,
            href: `/inventory/accessories/${a.id}`,
            text: `${a.make_model} ${a.type ?? ""} ${a.serial_number ?? ""} ${a.firearm_make_model ?? ""}`,
            sort: { name: a.make_model, type: a.type, serial: a.serial_number, mounted: a.firearm_make_model, value: a.purchase_value },
            cells: {
              name: (
                <Link href={`/inventory/accessories/${a.id}`} className="font-medium text-brand-amber hover:text-brand-amber-light">
                  {a.make_model}
                </Link>
              ),
              type: a.type ?? "—",
              serial: <span className="text-neutral-400">{a.serial_number ?? "—"}</span>,
              mounted: a.firearm_make_model ?? <span className="text-neutral-500">Not mounted</span>,
              value: a.purchase_value != null ? money(a.purchase_value, currency) : "—",
              actions: (
                <form action={deleteAccessory.bind(null, a.id)} className="text-right">
                  <ConfirmSubmitButton
                    confirmMessage={`Delete accessory "${a.make_model}"? Its receipts, photos, and mount history are removed too.`}
                    className="btn-link btn-link-danger text-xs"
                  >
                    Delete
                  </ConfirmSubmitButton>
                </form>
              ),
            },
          }))}
        />
      )}
    </div>
  );
}
