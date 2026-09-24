import Link from "next/link";
import { getDb } from "@/lib/db";
import type { Accessory, Firearm } from "@/lib/db/types";
import { getSettings, money } from "@/lib/settings";
import PrintButton from "@/components/PrintButton";
import { PrintFooter } from "@/components/CourseSheet";
import { fd } from "@/lib/display";
import { todayISO } from "@/lib/settings-shared";

export const dynamic = "force-dynamic";

type Photo = { owner_id: string; file_path: string };
type Disp = { firearm_id: string; date: string; type: string; recipient_name: string | null; recipient_ffl: string | null; price: number | null };

export default async function InventoryReportPage({
  searchParams,
}: {
  searchParams: Promise<{ sold?: string; photos?: string }>;
}) {
  const sp = await searchParams;
  const includeSold = sp.sold === "1";
  const showPhotos = sp.photos !== "0";
  const db = getDb();
  const settings = getSettings(db);
  const cur = settings.currencySymbol;

  const firearms = db
    .prepare(`select * from firearms ${includeSold ? "" : "where status != 'sold'"} order by status, make_model`)
    .all() as Firearm[];
  const accessories = db.prepare(`select * from accessories order by make_model`).all() as Accessory[];
  const photos = db
    .prepare(`select owner_id, file_path from attachments where kind = 'photo' order by uploaded_at asc`)
    .all() as Photo[];
  const docCounts = new Map(
    (
      db
        .prepare(
          `select owner_id, count(*) as n from attachments where kind in ('receipt','document','bill_of_sale') group by owner_id`
        )
        .all() as { owner_id: string; n: number }[]
    ).map((r) => [r.owner_id, r.n])
  );
  const disps = db
    .prepare(`select * from firearm_dispositions order by date desc`)
    .all() as Disp[];

  const photosFor = (id: string) => photos.filter((p) => p.owner_id === id).slice(0, 3);
  const keptFirearms = firearms.filter((f) => f.status !== "sold");
  const soldFirearms = firearms.filter((f) => f.status === "sold");
  const soldIds = new Set(
    (db.prepare(`select id from firearms where status = 'sold'`).all() as { id: string }[]).map((r) => r.id)
  );
  const mountedOn = (id: string) => accessories.filter((a) => a.firearm_id === id);
  const countedAccessories = accessories.filter((a) => !a.firearm_id || !soldIds.has(a.firearm_id));
  const looseAccessories = countedAccessories.filter((a) => !a.firearm_id);

  const firearmValue = keptFirearms.reduce((s, f) => s + (f.purchase_value ?? 0), 0);
  const accessoryValue = countedAccessories.reduce((s, a) => s + (a.purchase_value ?? 0), 0);
  const today = todayISO();

  const toggle = (key: string, value: string, label: string, on: boolean) => {
    const params = new URLSearchParams({ sold: includeSold ? "1" : "0", photos: showPhotos ? "1" : "0", [key]: value });
    return (
      <Link
        href={`/reports/inventory?${params}`}
        className={`border px-3 py-2 text-sm ${on ? "border-black bg-black text-white" : "border-neutral-400 hover:bg-neutral-100"}`}
      >
        {label}
      </Link>
    );
  };

  const cell = "border border-black px-2 py-1 align-top";

  return (
    <div className="print-sheet mx-auto max-w-4xl bg-white p-8 text-black">
      <div className="no-print mb-6 flex flex-wrap items-center gap-2">
        <PrintButton label="Print / Save as PDF" />
        {toggle("photos", showPhotos ? "0" : "1", showPhotos ? "Photos: On" : "Photos: Off", showPhotos)}
        {toggle("sold", includeSold ? "0" : "1", includeSold ? "Sold/Transferred: Included" : "Sold/Transferred: Hidden", includeSold)}
        <Link href="/inventory" className="ml-auto text-sm underline">
          Back to Armory
        </Link>
      </div>

      <h1 className="text-2xl font-bold uppercase">Firearm Inventory Report</h1>
      <p className="mb-4 text-sm">
        {settings.defaultShooterName ? `Owner: ${settings.defaultShooterName} · ` : ""}Generated {today} ·{" "}
        {keptFirearms.length} firearm{keptFirearms.length === 1 ? "" : "s"} · {countedAccessories.length} accessor
        {countedAccessories.length === 1 ? "y" : "ies"}
      </p>

      <table className="mb-6 w-full border-collapse text-sm">
        <tbody>
          <tr>
            <td className={cell}>Firearms (purchase value)</td>
            <td className={`${cell} text-right`}>{money(firearmValue, cur)}</td>
          </tr>
          <tr>
            <td className={cell}>Accessories (purchase value)</td>
            <td className={`${cell} text-right`}>{money(accessoryValue, cur)}</td>
          </tr>
          <tr>
            <td className={`${cell} font-bold`}>Total declared value</td>
            <td className={`${cell} text-right font-bold`}>{money(firearmValue + accessoryValue, cur)}</td>
          </tr>
        </tbody>
      </table>

      {keptFirearms.map((f, i) => {
        const pics = showPhotos ? photosFor(f.id) : [];
        const mounted = mountedOn(f.id);
        return (
          <section key={f.id} className="mb-5 break-inside-avoid border border-black p-3">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-lg font-bold uppercase">
                {i + 1}. {f.make_model}
                {f.nickname ? <span className="ml-2 text-sm font-normal normal-case">&ldquo;{f.nickname}&rdquo;</span> : null}
              </h2>
              <span className="text-xs uppercase">{f.status}</span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-0.5 text-sm">
              <div>
                <b>Serial #:</b> {f.serial_number ?? "—"}
              </div>
              <div>
                <b>Caliber:</b> {f.caliber ?? "—"}
              </div>
              <div>
                <b>Platform:</b> {f.platform ?? "—"}
              </div>
              <div>
                <b>Purchase value:</b> {f.purchase_value != null ? money(f.purchase_value, cur) : "—"}
              </div>
              <div>
                <b>Purchased:</b> {fd(f.purchase_date) || "—"}
              </div>
              <div>
                <b>From:</b> {f.purchase_location ?? "—"}
              </div>
              <div>
                <b>FFL #:</b> {f.ffl_license_number ?? "—"}
              </div>
              <div>
                <b>Receipts/documents on file:</b> {docCounts.get(f.id) ?? 0}
                {f.receipt ? ` (ref ${f.receipt})` : ""}
              </div>
              {f.notes && (
                <div className="col-span-2">
                  <b>Notes:</b> {f.notes}
                </div>
              )}
            </div>
            {pics.length > 0 && (
              <div className="mt-2 flex gap-2">
                {pics.map((p) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={p.file_path} src={`/api/receipts/${p.file_path}`} alt="" className="h-32 w-auto max-w-[32%] object-contain" />
                ))}
              </div>
            )}
            {mounted.length > 0 && (
              <table className="mt-2 w-full border-collapse text-xs">
                <thead>
                  <tr>
                    <th className={`${cell} text-left`}>Mounted accessory</th>
                    <th className={`${cell} text-left`}>Type</th>
                    <th className={`${cell} text-left`}>Serial #</th>
                    <th className={`${cell} text-right`}>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {mounted.map((a) => (
                    <tr key={a.id}>
                      <td className={cell}>{a.make_model}</td>
                      <td className={cell}>{a.type ?? "—"}</td>
                      <td className={cell}>{a.serial_number ?? "—"}</td>
                      <td className={`${cell} text-right`}>{a.purchase_value != null ? money(a.purchase_value, cur) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        );
      })}

      {looseAccessories.length > 0 && (
        <section className="mb-5 break-inside-avoid">
          <h2 className="mb-1 font-bold uppercase">Accessories not mounted</h2>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className={`${cell} text-left`}>Accessory</th>
                <th className={`${cell} text-left`}>Type</th>
                <th className={`${cell} text-left`}>Serial #</th>
                <th className={`${cell} text-left`}>Acquired</th>
                <th className={`${cell} text-right`}>Value</th>
              </tr>
            </thead>
            <tbody>
              {looseAccessories.map((a) => (
                <tr key={a.id}>
                  <td className={cell}>{a.make_model}</td>
                  <td className={cell}>{a.type ?? "—"}</td>
                  <td className={cell}>{a.serial_number ?? "—"}</td>
                  <td className={cell}>{fd(a.acquisition_date) || "—"}</td>
                  <td className={`${cell} text-right`}>{a.purchase_value != null ? money(a.purchase_value, cur) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {includeSold && soldFirearms.length > 0 && (
        <section className="mb-5 break-inside-avoid">
          <h2 className="mb-1 font-bold uppercase">Sold / transferred (not counted in totals)</h2>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className={`${cell} text-left`}>Firearm</th>
                <th className={`${cell} text-left`}>Serial #</th>
                <th className={`${cell} text-left`}>Record</th>
              </tr>
            </thead>
            <tbody>
              {soldFirearms.map((f) => {
                const d = disps.find((x) => x.firearm_id === f.id);
                return (
                  <tr key={f.id}>
                    <td className={cell}>{f.make_model}</td>
                    <td className={cell}>{f.serial_number ?? "—"}</td>
                    <td className={cell}>
                      {d
                        ? `${fd(d.date)} · ${d.type}${d.recipient_name ? ` to ${d.recipient_name}` : ""}${
                            d.recipient_ffl ? ` (FFL ${d.recipient_ffl})` : ""
                          }${d.price != null ? ` · ${money(d.price, cur)}` : ""}`
                        : "No sale/transfer record entered"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      <div className="mt-8 grid grid-cols-2 gap-8 text-sm">
        <div className="flex items-end gap-2">
          <span>Owner signature:</span>
          <span className="flex-1 border-b border-black">&nbsp;</span>
        </div>
        <div className="flex items-end gap-2">
          <span>Date:</span>
          <span className="flex-1 border-b border-black">&nbsp;</span>
        </div>
      </div>
      <p className="mt-4 text-[10px] text-neutral-600">
        Values are purchase values as recorded in TAC-LOG, not appraisals. Keep a copy of this report and a TAC-LOG
        backup somewhere other than this computer.
      </p>
      <PrintFooter />
    </div>
  );
}
