import type { CertificateSettings, DateFormat } from "@/lib/settings-shared";
import type { Certification, CertificationCourse } from "@/lib/certifications";

export type SheetRow = {
  id: string;
  number: number;
  student_id: string;
  last_name: string;
  first_name: string;
  issued_on: string;
  expires_on: string | null;
  scores: { course: string; percent: number | null; passed: boolean }[];
};

function fmt(iso: string, format: DateFormat) {
  const [y, m, d] = iso.split("-");
  if (format === "iso") return iso;
  if (format === "eu") return `${d}/${m}/${y}`;
  return `${m}/${d}/${y}`;
}

export default function CertificateSheet({
  settings,
  certification,
  courses,
  rows,
  dateFormat,
}: {
  settings: CertificateSettings;
  certification: Certification;
  courses: CertificationCourse[];
  rows: SheetRow[];
  dateFormat: DateFormat;
}) {
  const title = certification.certificate_title || settings.title;
  const body = certification.certificate_body || settings.body;

  return (
    <div className="certificates">
      {rows.map((r) => (
        <div key={r.id}>
          <article className="cert-page">
            <div className="cert-frame">
              {settings.schoolName ? <div className="cert-school">{settings.schoolName}</div> : null}
              <h1 className="cert-title">{title}</h1>
              <div className="cert-rule" />
              <p className="cert-lead">This certifies that</p>
              <p className="cert-name">
                {r.first_name} {r.last_name}
              </p>
              <p className="cert-body">{body}</p>
              <p className="cert-cert">{certification.name}</p>

              {settings.showCourses && courses.length > 0 ? (
                <p className="cert-courses">{courses.map((c) => c.code || c.name).join(" · ")}</p>
              ) : null}

              <div className="cert-foot">
                <div className="cert-sig">
                  <div className="cert-sig-line" />
                  <div className="cert-sig-label">{settings.signatureLabel}</div>
                </div>
                <div className="cert-meta">
                  <div>Issued {fmt(r.issued_on, dateFormat)}</div>
                  {settings.showExpiry && r.expires_on ? <div>Expires {fmt(r.expires_on, dateFormat)}</div> : null}
                  <div>Certificate No. {r.number}</div>
                </div>
              </div>
            </div>
          </article>

          {settings.scorePage && r.scores.length > 0 ? (
            <article className="cert-page cert-scores">
              <h2>
                {r.first_name} {r.last_name} — {certification.name}
              </h2>
              <div className="cert-rule" />
              <table>
                <thead>
                  <tr>
                    <th>Course of fire</th>
                    <th>Score</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {r.scores.map((s) => (
                    <tr key={s.course}>
                      <td>{s.course}</td>
                      <td>{s.percent === null ? "—" : `${s.percent.toFixed(1)}%`}</td>
                      <td>{s.passed ? "PASS" : "FAIL"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="cert-scorenote">Certificate No. {r.number} · Issued {fmt(r.issued_on, dateFormat)}</p>
            </article>
          ) : null}
        </div>
      ))}
    </div>
  );
}
