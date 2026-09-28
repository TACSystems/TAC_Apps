import Link from "next/link";
import PageHeader from "@core/components/PageHeader";
import DataTable, { type TableRow } from "@core/components/DataTable";
import EmptyState from "@core/components/EmptyState";
import { getDb } from "@/lib/db";
import { credentialCurrency, type CredentialRow, type CredentialStatus } from "@/lib/records";
import { getSettings } from "@/lib/settings";
import { todayISO } from "@/lib/settings-shared";
import { fd } from "@/lib/display";

export const dynamic = "force-dynamic";

const FILTERS = [
  { key: "attention", label: "Needs attention" },
  { key: "expired", label: "Expired" },
  { key: "due_soon", label: "Due soon" },
  { key: "current", label: "Current" },
  { key: "everyone", label: "Everyone" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

const LABEL: Record<CredentialStatus, string> = {
  current: "Current",
  due_soon: "Due soon",
  expired: "Expired",
};

const TONE: Record<CredentialStatus, string> = {
  current: "text-green-400",
  due_soon: "text-brand-amber",
  expired: "text-red-400",
};

export function matches(row: CredentialRow, filter: FilterKey) {
  if (filter === "everyone") return true;
  if (filter === "attention") return row.status === "expired" || row.status === "due_soon";
  return row.status === filter;
}

export default async function CurrencyPage({
  searchParams,
}: {
  searchParams: Promise<{ f?: string }>;
}) {
  const { f } = await searchParams;
  const filter = (FILTERS.some((x) => x.key === f) ? f : "attention") as FilterKey;

  const db = getDb();
  const settings = getSettings(db);
  const dueSoonDays = settings.home.currencyDueSoonDays;
  const all = credentialCurrency(db, todayISO(), dueSoonDays);
  const rows = all.filter((r) => matches(r, filter));
  const count = (k: FilterKey) => all.filter((r) => matches(r, k)).length;

  const table: TableRow[] = rows.map((r) => ({
    key: r.key,
    href: `/students/${r.student_id}`,
    text: `${r.last_name}, ${r.first_name} ${r.credential_name} ${r.credential_code ?? ""} ${LABEL[r.status]}`,
    sort: {
      student: `${r.last_name}, ${r.first_name}`,
      credential: r.credential_name,
      earned: r.earned_on ?? "",
      expires: r.expires_on,
      status: r.days_left,
    },
    cells: {
      student: (
        <span>
          <span className="font-bold">{`${r.last_name}, ${r.first_name}`}</span>
          {r.email || r.phone ? (
            <span className="block text-xs text-neutral-400">{[r.phone, r.email].filter(Boolean).join(" · ")}</span>
          ) : null}
        </span>
      ),
      credential: (
        <span>
          {r.credential_name}
          <span className="block text-xs text-neutral-400">
            {r.kind === "certification"
              ? r.certificate_number !== null
                ? `Certification · certificate #${r.certificate_number}`
                : "Certification"
              : `Course${r.credential_code ? ` · ${r.credential_code}` : ""}`}
          </span>
        </span>
      ),
      earned: r.earned_on ? fd(r.earned_on) : "—",
      expires: fd(r.expires_on),
      status: (
        <span className={TONE[r.status]}>
          {LABEL[r.status]}
          {r.status !== "current" && (
            <span className="block text-xs text-neutral-500">
              {r.days_left < 0 ? `${Math.abs(r.days_left)} days ago` : `in ${r.days_left} days`}
            </span>
          )}
        </span>
      ),
    },
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Currency"
        icon="clock"
        subtitle={`Who is still qualified and who is not. Due soon means inside ${dueSoonDays} days.`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link className="btn" href={`/records/currency/print?f=${filter}`}>
              Print List
            </Link>
            <a className="btn" href={`/api/csv?type=currency&f=${filter}`}>
              Export CSV
            </a>
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((x) => (
          <Link
            key={x.key}
            href={`/records/currency?f=${x.key}`}
            className={`border px-4 py-2 text-sm tracking-wide ${
              x.key === filter ? "border-brand-amber text-brand-amber" : "border-neutral-800 text-neutral-400"
            }`}
          >
            {x.label} <span className="ml-1 text-neutral-500">{count(x.key)}</span>
          </Link>
        ))}
      </div>

      {all.length === 0 ? (
        <EmptyState title="Nothing expires yet">
          Currency follows the courses that lapse. Set an expiry on a course under Scoring Setup, and a student who
          passes it — or a certification built from it — shows up here.
        </EmptyState>
      ) : rows.length === 0 ? (
        <EmptyState title="Nothing in this list">Try Everyone.</EmptyState>
      ) : (
        <DataTable
          columns={[
            { key: "student", label: "Student", sortable: true },
            { key: "credential", label: "Credential", sortable: true },
            { key: "earned", label: "Earned", align: "right", sortable: true },
            { key: "expires", label: "Current until", align: "right", sortable: true },
            { key: "status", label: "Status", sortable: true },
          ]}
          rows={table}
          initialSort={{ key: "status", dir: "asc" }}
          filterPlaceholder="Filter by student, credential or status…"
        />
      )}

      <p className="text-xs text-neutral-500">
        One row per credential a student holds. A student partway through a certification is not here — they have
        nothing to renew yet, and <Link href="/certifications" className="text-brand-amber">Certifications</Link> shows
        what they are missing. Courses that never expire, and inactive students, are left out entirely.
      </p>
    </div>
  );
}
