import Link from "next/link";
import PrintButton from "@core/components/PrintButton";
import PrintHeader from "@core/components/PrintHeader";
import { getDb } from "@/lib/db";
import { credentialCurrency } from "@/lib/records";
import { getSettings } from "@/lib/settings";
import { todayISO } from "@/lib/settings-shared";
import { fd } from "@/lib/display";
import { matches } from "../page";

export const dynamic = "force-dynamic";

const LABEL = { current: "Current", due_soon: "Due soon", expired: "Expired" } as const;

export default async function CurrencyPrintPage({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const { f } = await searchParams;
  const filter = (["attention", "expired", "due_soon", "current", "everyone"].includes(f ?? "")
    ? f
    : "attention") as Parameters<typeof matches>[1];

  const db = getDb();
  const settings = getSettings(db);
  const rows = credentialCurrency(db, todayISO(), settings.home.currencyDueSoonDays).filter((r) =>
    matches(r, filter)
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 print:hidden">
        <PrintButton />
        <Link className="btn" href={`/records/currency?f=${filter}`}>
          Back to Currency
        </Link>
      </div>

      <PrintHeader
        app="TAC-QUAL"
        title={`Currency — ${rows.length} credential${rows.length === 1 ? "" : "s"}`}
        printed={fd(todayISO())}
      />

      <table className="table">
        <thead>
          <tr>
            <th>Student</th>
            <th>Contact</th>
            <th>Credential</th>
            <th>Earned</th>
            <th>Current until</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <td>{`${r.last_name}, ${r.first_name}`}</td>
              <td>{[r.phone, r.email].filter(Boolean).join(" · ") || "—"}</td>
              <td>
                {r.credential_name}
                {r.certificate_number !== null ? ` · #${r.certificate_number}` : ""}
              </td>
              <td>{r.earned_on ? fd(r.earned_on) : "—"}</td>
              <td>{fd(r.expires_on)}</td>
              <td>
                {LABEL[r.status]}
                {r.status !== "current" ? ` (${r.days_left < 0 ? `${Math.abs(r.days_left)} days ago` : `in ${r.days_left} days`})` : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
