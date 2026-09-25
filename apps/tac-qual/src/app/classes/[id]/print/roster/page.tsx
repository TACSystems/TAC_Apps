import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { classInstructors, classNumberLabel, getClass, relays } from "@/lib/classes";
import { studentName } from "@/lib/students";
import { fd } from "@/lib/display";
import PrintSheet from "@/components/PrintSheet";

export const dynamic = "force-dynamic";

export default async function RosterPrint({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const klass = getClass(db, id);
  if (!klass) notFound();
  const byRelay = relays(db, id);
  const instructors = classInstructors(db, id);

  return (
    <PrintSheet
      title="Class Roster & Sign-In"
      subtitle={`${classNumberLabel(klass.number)} · ${fd(klass.date)}`}
      backHref={`/classes/${id}`}
      backLabel={klass.title}
    >
      <div className="space-y-1 text-sm">
        <div>
          <strong>{klass.title}</strong>
        </div>
        {klass.location && <div>Location: {klass.location}</div>}
        {instructors.length > 0 && <div>Instructors: {instructors.map((i) => i.name).join(", ")}</div>}
      </div>

      {byRelay.map(([relay, rows]) => (
        <section key={String(relay)} className="space-y-2">
          <h2 className="text-xs tracking-widest">{relay == null ? "UNASSIGNED" : `RELAY ${relay}`}</h2>
          <table className="table">
            <thead>
              <tr>
                <th className="w-16">Lane</th>
                <th>Student</th>
                <th>Firearm</th>
                <th className="w-64">Signature</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.lane ?? ""}</td>
                  <td>{studentName(r)}</td>
                  <td />
                  <td>
                    <span className="sign-line">&nbsp;</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </PrintSheet>
  );
}
