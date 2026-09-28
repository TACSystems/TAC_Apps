import Link from "next/link";
import { notFound } from "next/navigation";
import PageHeader from "@core/components/PageHeader";
import ConfirmSubmitButton from "@core/components/ConfirmSubmitButton";
import { getDb } from "@/lib/db";
import { todayISO } from "@core/lib/format";
import { certificationCourses, getCertification, holdings } from "@/lib/certifications";
import { deleteCertificationAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function CertificationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const cert = getCertification(db, id);
  if (!cert) notFound();

  const courses = certificationCourses(db, id);
  const today = todayISO();
  const rows = holdings(db, id, today);
  const complete = rows.filter((r) => r.complete);
  const partway = rows.filter((r) => !r.complete);
  const issued = complete.filter((r) => r.certificate_number !== null);
  const byId = new Map(courses.map((c) => [c.cof_id, c]));

  return (
    <div className="space-y-6">
      <PageHeader
        title={cert.name}
        icon="badge"
        subtitle={cert.code ?? undefined}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link className="btn" href={`/certifications/${id}/edit`}>
              Edit
            </Link>
            <form action={deleteCertificationAction}>
              <input type="hidden" name="id" value={id} />
              <ConfirmSubmitButton className="btn btn-danger" confirmMessage={`Delete ${cert.name}?`}>
                Delete
              </ConfirmSubmitButton>
            </form>
          </div>
        }
      />

      {cert.description ? <p className="text-neutral-400">{cert.description}</p> : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card">
          <div className="text-xs uppercase tracking-widest text-neutral-500">Hold it</div>
          <div className="text-3xl font-bold">{complete.length}</div>
        </div>
        <div className="card">
          <div className="text-xs uppercase tracking-widest text-neutral-500">Partway through</div>
          <div className="text-3xl font-bold">{partway.length}</div>
        </div>
        <div className="card">
          <div className="text-xs uppercase tracking-widest text-neutral-500">Certificates issued</div>
          <div className="text-3xl font-bold">{issued.length}</div>
        </div>
      </div>

      <section className="card space-y-3">
        <h2 className="text-lg font-bold uppercase tracking-wide">Courses required</h2>
        <ol className="space-y-1">
          {courses.map((c, i) => (
            <li key={c.cof_id} className="flex gap-3">
              <span className="w-6 text-right text-neutral-500">{i + 1}</span>
              <Link className="underline" href={`/courses/${c.cof_id}`}>
                {c.code ? `${c.code} · ` : ""}
                {c.name}
              </Link>
              {c.expires_months ? (
                <span className="text-neutral-500">expires after {c.expires_months} months</span>
              ) : (
                <span className="text-neutral-500">never expires</span>
              )}
            </li>
          ))}
        </ol>
      </section>

      <section className="card space-y-3">
        <h2 className="text-lg font-bold uppercase tracking-wide">Students</h2>
        {rows.length === 0 ? (
          <p className="text-neutral-500">Nobody has passed any of these courses yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Standing</th>
                <th>Certificate</th>
                <th>Expires</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.student_id}>
                  <td>
                    <Link className="underline" href={`/students/${r.student_id}`}>
                      {r.last_name}, {r.first_name}
                    </Link>
                  </td>
                  <td>
                    {r.complete ? (
                      <span className="result-badge result-pass">Holds it</span>
                    ) : (
                      <span className="text-neutral-400">
                        needs {r.missing.map((m) => byId.get(m)?.code || byId.get(m)?.name).join(", ")}
                      </span>
                    )}
                  </td>
                  <td>
                    {r.certificate_number !== null ? `#${r.certificate_number}` : r.complete ? "not issued" : "—"}
                  </td>
                  <td>{r.expires_on ?? (r.complete ? "never" : "—")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
