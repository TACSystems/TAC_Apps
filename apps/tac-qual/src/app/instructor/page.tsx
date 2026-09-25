import PageHeader from "@core/components/PageHeader";
import Collapsible from "@core/components/Collapsible";
import SubmitButton from "@core/components/SubmitButton";
import ConfirmSubmitButton from "@core/components/ConfirmSubmitButton";
import UnsavedGuard from "@core/components/UnsavedGuard";
import { getDb } from "@/lib/db";
import { fd } from "@/lib/display";
import { addCert, removeCert, saveProfile } from "./actions";
import { todayISO } from "@core/lib/format";

export const dynamic = "force-dynamic";

type Profile = {
  id: string;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
};

type Cert = {
  id: string;
  name: string;
  issuer: string | null;
  number: string | null;
  issued_date: string | null;
  expires_date: string | null;
};

function certState(expires: string | null, today: string) {
  if (!expires) return { label: "No expiry", tone: "text-neutral-400" };
  if (expires < today) return { label: "Expired", tone: "text-red-400" };
  const soon = new Date(today);
  soon.setDate(soon.getDate() + 60);
  if (expires <= soon.toISOString().slice(0, 10)) return { label: "Expiring", tone: "text-amber-400" };
  return { label: "Current", tone: "text-green-400" };
}

export default async function InstructorPage() {
  const db = getDb();
  const profile = (db.prepare(`select * from instructor_profile where id = 'me'`).get() as Profile | undefined) ?? null;
  const certs = db.prepare(`select * from instructor_certs order by sort_order, name`).all() as Cert[];
  const today = todayISO();

  return (
    <div className="space-y-6">
      <PageHeader title="Instructor" subtitle="Your name and certifications print on results sheets" />

      <form action={saveProfile} className="brk card space-y-4 p-5">
        <UnsavedGuard />
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="field">
            <span className="req">Name</span>
            <input className="input" name="name" defaultValue={profile?.name ?? ""} required maxLength={120} />
          </label>
          <label className="field">
            <span>Title</span>
            <input
              className="input"
              name="title"
              defaultValue={profile?.title ?? ""}
              placeholder="Lead Instructor"
              maxLength={120}
            />
          </label>
          <label className="field">
            <span>Email</span>
            <input className="input" type="email" name="email" defaultValue={profile?.email ?? ""} maxLength={160} />
          </label>
          <label className="field">
            <span>Phone</span>
            <input className="input" name="phone" defaultValue={profile?.phone ?? ""} maxLength={40} />
          </label>
        </div>
        <label className="field">
          <span>Notes</span>
          <textarea className="input min-h-20" name="notes" defaultValue={profile?.notes ?? ""} maxLength={2000} />
        </label>
        <SubmitButton className="btn btn-primary" pendingLabel="Saving…">
          Save Profile
        </SubmitButton>
      </form>

      <Collapsible
        scope="instructor"
        id="certs"
        title="Certifications"
        defaultOpen
        summary={`${certs.length} on file`}
      >
        <div className="space-y-4 p-4">
          {certs.length === 0 ? (
            <p className="text-neutral-400">No certifications recorded.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Certification</th>
                  <th>Issuer</th>
                  <th>Number</th>
                  <th>Issued</th>
                  <th>Expires</th>
                  <th>Status</th>
                  <th className="text-right">—</th>
                </tr>
              </thead>
              <tbody>
                {certs.map((c) => {
                  const st = certState(c.expires_date, today);
                  return (
                    <tr key={c.id}>
                      <td className="font-bold">{c.name}</td>
                      <td>{c.issuer ?? "—"}</td>
                      <td>{c.number ?? "—"}</td>
                      <td>{c.issued_date ? fd(c.issued_date) : "—"}</td>
                      <td>{c.expires_date ? fd(c.expires_date) : "—"}</td>
                      <td className={st.tone}>{st.label}</td>
                      <td className="text-right">
                        <form action={removeCert}>
                          <input type="hidden" name="id" value={c.id} />
                          <ConfirmSubmitButton className="btn btn-danger" confirmMessage={`Remove ${c.name}?`}>
                            Remove
                          </ConfirmSubmitButton>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          <form action={addCert} className="grid gap-3 sm:grid-cols-5">
            <label className="field sm:col-span-2">
              <span className="req">Certification</span>
              <input className="input" name="name" required maxLength={120} />
            </label>
            <label className="field">
              <span>Issuer</span>
              <input className="input" name="issuer" maxLength={120} />
            </label>
            <label className="field">
              <span>Issued</span>
              <input className="input" type="date" name="issued_date" />
            </label>
            <label className="field">
              <span>Expires</span>
              <input className="input" type="date" name="expires_date" />
            </label>
            <div className="sm:col-span-5">
              <SubmitButton className="btn" pendingLabel="Adding…">
                + Add Certification
              </SubmitButton>
            </div>
          </form>
        </div>
      </Collapsible>
    </div>
  );
}
