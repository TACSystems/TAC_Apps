import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import type { Accessory, Firearm } from "@/lib/db/types";
import { getDropdownOptions } from "@/lib/db/dropdown-options";
import { listAttachments } from "@/lib/attachments";
import { getSettings, money } from "@/lib/settings";
import { deleteAccessory, deleteMountEntry, updateAccessory } from "@/app/inventory/actions";
import AccessoryForm from "@/components/AccessoryForm";
import AttachmentGallery from "@/components/AttachmentGallery";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";

export const dynamic = "force-dynamic";

type Mount = {
  id: string;
  firearm_id: string | null;
  firearm_label: string | null;
  current_name: string | null;
  from_date: string | null;
  to_date: string | null;
  notes: string | null;
};

export default async function AccessoryDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { id } = await params;
  const { saved } = await searchParams;
  const db = getDb();
  const accessory = db.prepare(`select * from accessories where id = ?`).get(id) as Accessory | undefined;
  if (!accessory) notFound();
  const settings = getSettings(db);

  const firearms = db
    .prepare(`select id, make_model, status from firearms order by make_model`)
    .all() as Pick<Firearm, "id" | "make_model" | "status">[];
  const mounted = firearms.find((f) => f.id === accessory.firearm_id);
  const mounts = db
    .prepare(
      `select m.*, f.make_model as current_name from accessory_mounts m
       left join firearms f on f.id = m.firearm_id
       where m.accessory_id = ? order by coalesce(m.from_date, m.created_at) desc, m.created_at desc`
    )
    .all(id) as Mount[];
  const photos = listAttachments(db, "accessory", id, ["photo"]);
  const receipts = listAttachments(db, "accessory", id, ["receipt", "document"]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/inventory/accessories" className="text-xs text-blue-400 hover:text-blue-300">
          ← Accessories
        </Link>
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-semibold">{accessory.make_model}</h1>
          <form action={deleteAccessory.bind(null, id)}>
            <ConfirmSubmitButton
              confirmMessage={`Delete ${accessory.make_model}? Its receipts, photos, and mount history are removed too. This cannot be undone.`}
              className="border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-200 hover:bg-red-900"
            >
              Delete
            </ConfirmSubmitButton>
          </form>
        </div>
        <p className="mb-4 text-sm text-neutral-400">
          {accessory.type ?? "Accessory"}
          {accessory.serial_number ? ` · SN ${accessory.serial_number}` : ""}
          {accessory.purchase_value != null ? ` · ${money(accessory.purchase_value, settings.currencySymbol)}` : ""}
          {" · "}
          {mounted ? (
            <>
              mounted on{" "}
              <Link href={`/inventory/${mounted.id}`} className="text-blue-400 hover:text-blue-300">
                {mounted.make_model}
              </Link>
            </>
          ) : (
            "not mounted"
          )}
        </p>
        {saved && <p className="mb-3 text-sm text-green-400">Saved.</p>}
        <div className="max-w-2xl">
          <AccessoryForm
            accessory={accessory}
            firearms={firearms}
            typeOptions={getDropdownOptions(db, "accessory_type")}
            platformOptions={getDropdownOptions(db, "platform")}
            action={updateAccessory.bind(null, id)}
            submitLabel="Save Changes"
          />
        </div>
      </div>

      <AttachmentGallery
        title="Photos"
        items={photos}
        ownerType="accessory"
        ownerId={id}
        kind="photo"
        imagesOnly
        emptyText="No photos yet."
      />

      <AttachmentGallery
        title="Receipts & Documents"
        items={receipts}
        ownerType="accessory"
        ownerId={id}
        kind="receipt"
        emptyText="No receipts uploaded yet."
      />

      <section>
        <h2 className="mb-2 font-medium text-neutral-200">Mount History</h2>
        <p className="mb-2 text-sm text-neutral-400">
          Recorded automatically when you change &quot;Mounted On&quot; above.
        </p>
        <div className="flex flex-col gap-1 sm:max-w-2xl">
          {mounts.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between gap-2 border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-sm"
            >
              <span>
                {m.firearm_id && m.current_name ? (
                  <Link href={`/inventory/${m.firearm_id}`} className="text-blue-400 hover:text-blue-300">
                    {m.current_name}
                  </Link>
                ) : (
                  <span>{m.firearm_label ?? "Deleted firearm"}</span>
                )}
                <span className="text-neutral-400">
                  {" · "}
                  {m.from_date ?? "?"} → {m.to_date ?? "present"}
                </span>
                {m.notes ? <span className="text-neutral-500"> · {m.notes}</span> : null}
              </span>
              <form action={deleteMountEntry.bind(null, id, m.id)}>
                <ConfirmSubmitButton confirmMessage="Remove this history entry?" className="text-xs text-red-400 hover:text-red-300">
                  Remove
                </ConfirmSubmitButton>
              </form>
            </div>
          ))}
          {mounts.length === 0 && <p className="text-sm text-neutral-500">Never mounted.</p>}
        </div>
      </section>
    </div>
  );
}
