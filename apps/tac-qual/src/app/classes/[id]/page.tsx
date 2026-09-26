import { notFound } from "next/navigation";
import PageHeader from "@core/components/PageHeader";
import Collapsible from "@core/components/Collapsible";
import SubmitButton from "@core/components/SubmitButton";
import { todayISO } from "@/lib/settings-shared";
import ConfirmSubmitButton from "@core/components/ConfirmSubmitButton";
import { getDb } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import {
  classCourses,
  classInstructors,
  classNumberLabel,
  getClass,
  relays,
} from "@/lib/classes";
import { listStudents, studentName } from "@/lib/students";
import { classResults } from "@/lib/scoring";
import { fd } from "@/lib/display";
import ResultBadge from "@/components/ResultBadge";
import {
  addClassCourse,
  addClassInstructor,
  autoRelays,
  enrollStudents,
  copyClass,
  removeClass,
  removeClassCourse,
  removeClassInstructor,
  saveRelayLane,
  unenrollStudent,
} from "@/app/classes/actions";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = { lead: "Lead", assistant: "Assistant", grader: "Grader" };

export default async function ClassPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const klass = getClass(db, id);
  if (!klass) notFound();

  const settings = getSettings(db);
  const courses = classCourses(db, id);
  const instructors = classInstructors(db, id);
  const byRelay = relays(db, id);
  const enrolledIds = new Set(byRelay.flatMap(([, rows]) => rows.map((r) => r.student_id)));
  const roster = listStudents(db, "active").filter((s) => !enrolledIds.has(s.id));
  const allCourses = db
    .prepare(`select id, code, name from courses_of_fire order by name`)
    .all() as { id: string; code: string; name: string }[];
  const availableCourses = allCourses.filter((c) => !courses.some((cc) => cc.cof_id === c.id));
  const totalStudents = byRelay.reduce((n, [, rows]) => n + rows.length, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={klass.title}
        subtitle={`${classNumberLabel(klass.number)} · ${fd(klass.date)}${klass.location ? ` · ${klass.location}` : ""}`}
        back={{ href: "/classes", label: "Classes" }}
        actions={
          <div className="flex flex-wrap gap-2">
            <a className="btn" href={`/classes/${id}/print/roster`}>
              Print Roster
            </a>
            <a className="btn" href={`/classes/${id}/print/results`}>
              Print Results
            </a>
            <a className="btn btn-primary" href={`/classes/${id}/edit`}>
              Edit
            </a>
          </div>
        }
      />

      <section className="brk card p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <div className="text-xs tracking-widest text-neutral-400">Students</div>
            <div className="text-3xl font-bold">{totalStudents}</div>
          </div>
          <div>
            <div className="text-xs tracking-widest text-neutral-400">Courses of fire</div>
            <div className="text-3xl font-bold">{courses.length}</div>
          </div>
          <div>
            <div className="text-xs tracking-widest text-neutral-400">Relays</div>
            <div className="text-3xl font-bold">{byRelay.filter(([r]) => r != null).length}</div>
          </div>
        </div>
        {klass.notes && <p className="mt-4 whitespace-pre-wrap text-neutral-300">{klass.notes}</p>}
      </section>

      <Collapsible
        scope={`class:${id}`}
        id="courses"
        title="Courses of Fire"
        defaultOpen
        summary={`${courses.length} on the plan`}
      >
        <div className="space-y-4 p-4">
          {courses.length === 0 ? (
            <p className="text-neutral-400">
              No courses on this class yet. Add one below, then score it by relay.
            </p>
          ) : (
            <ul className="space-y-2">
              {courses.map((c) => {
                const runs = classResults(db, id, c.cof_id);
                const passes = runs.filter((r) => r.passed === 1).length;
                return (
                  <li key={c.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
                    <div>
                      <div className="font-bold">{c.name}</div>
                      <div className="text-xs text-neutral-400">
                        {c.code}
                        {c.passing_score_percent != null ? ` · ${c.passing_score_percent}% to pass` : ""}
                        {c.total_rounds ? ` · ${c.total_rounds} rds` : ""}
                        {runs.length ? ` · ${passes}/${runs.length} passed` : " · not scored"}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <a className="btn" href={`/classes/${id}/print/scorecards?cof=${c.cof_id}`}>
                        Blank Cards
                      </a>
                      <a className="btn btn-primary" href={`/classes/${id}/score/${c.cof_id}`}>
                        Score
                      </a>
                      <form action={removeClassCourse}>
                        <input type="hidden" name="id" value={c.id} />
                        <input type="hidden" name="class_id" value={id} />
                        <ConfirmSubmitButton
                          className="btn btn-danger"
                          confirmMessage={`Remove ${c.name} from this class? Scores already recorded for it stay.`}
                        >
                          Remove
                        </ConfirmSubmitButton>
                      </form>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {availableCourses.length > 0 && (
            <form action={addClassCourse} className="flex flex-wrap items-end gap-3">
              <input type="hidden" name="class_id" value={id} />
              <label className="field min-w-64 flex-1">
                <span>Add a course</span>
                <select className="input" name="cof_id" defaultValue="">
                  <option value="" disabled>
                    Choose a course of fire…
                  </option>
                  {availableCourses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </label>
              <SubmitButton className="btn" pendingLabel="Adding…">
                + Add Course
              </SubmitButton>
            </form>
          )}
        </div>
      </Collapsible>

      <Collapsible
        scope={`class:${id}`}
        id="roster"
        title="Roster and Relays"
        defaultOpen
        summary={`${totalStudents} enrolled`}
      >
        <div className="space-y-5 p-4">
          {byRelay.length === 0 ? (
            <p className="text-neutral-400">Nobody is enrolled yet.</p>
          ) : (
            byRelay.map(([relay, rows]) => (
              <div key={String(relay)} className="space-y-2">
                <h3 className="text-xs tracking-widest text-neutral-400">
                  {relay == null ? "Unassigned" : `Relay ${relay}`} · {rows.length}
                </h3>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th className="w-24">Relay</th>
                      <th className="w-24">Lane</th>
                      <th className="text-right">—</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id}>
                        <td className="font-bold">
                          <a href={`/students/${r.student_id}`}>{studentName(r)}</a>
                        </td>
                        <td colSpan={2}>
                          <form action={saveRelayLane} className="flex items-center gap-2">
                            <input type="hidden" name="id" value={r.id} />
                            <input type="hidden" name="class_id" value={id} />
                            <input
                              className="input w-20"
                              type="number"
                              name="relay"
                              min={1}
                              max={99}
                              defaultValue={r.relay ?? ""}
                              aria-label={`Relay for ${studentName(r)}`}
                            />
                            <input
                              className="input w-20"
                              type="number"
                              name="lane"
                              min={1}
                              max={99}
                              defaultValue={r.lane ?? ""}
                              aria-label={`Lane for ${studentName(r)}`}
                            />
                            <SubmitButton className="btn" pendingLabel="…">
                              Set
                            </SubmitButton>
                          </form>
                        </td>
                        <td className="text-right">
                          <form action={unenrollStudent}>
                            <input type="hidden" name="id" value={r.id} />
                            <input type="hidden" name="class_id" value={id} />
                            <ConfirmSubmitButton
                              className="btn btn-danger"
                              confirmMessage={`Remove ${studentName(r)} from this class?`}
                            >
                              Remove
                            </ConfirmSubmitButton>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))
          )}

          <form action={autoRelays} className="flex flex-wrap items-end gap-3 border-t border-neutral-800 pt-4">
            <input type="hidden" name="class_id" value={id} />
            <label className="field w-40">
              <span>Relay size</span>
              <input className="input" type="number" name="size" min={1} max={40} defaultValue={settings.defaultRelaySize} />
            </label>
            <ConfirmSubmitButton
              className="btn"
              confirmMessage="Reassign every enrolled student into relays of this size? Current relay and lane numbers are replaced."
            >
              Auto-assign Relays
            </ConfirmSubmitButton>
          </form>

          {roster.length > 0 && (
            <form action={enrollStudents} className="space-y-3 border-t border-neutral-800 pt-4">
              <input type="hidden" name="class_id" value={id} />
              <h3 className="text-xs tracking-widest text-neutral-400">Enroll students</h3>
              <div className="grid max-h-64 gap-1 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
                {roster.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 p-1">
                    <input type="checkbox" name="student_id" value={s.id} />
                    <span>{studentName(s)}</span>
                  </label>
                ))}
              </div>
              <SubmitButton className="btn btn-primary" pendingLabel="Enrolling…">
                Enroll Selected
              </SubmitButton>
            </form>
          )}
        </div>
      </Collapsible>

      <Collapsible
        scope={`class:${id}`}
        id="instructors"
        title="Instructors"
        defaultOpen={false}
        summary={instructors.length ? instructors.map((i) => i.name).join(", ") : "None credited"}
      >
        <div className="space-y-4 p-4">
          {instructors.length > 0 && (
            <ul className="space-y-2">
              {instructors.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-3">
                  <span>
                    <span className="font-bold">{i.name}</span>
                    <span className="ml-2 text-xs tracking-widest text-neutral-400">{ROLE_LABEL[i.role]}</span>
                  </span>
                  <form action={removeClassInstructor}>
                    <input type="hidden" name="id" value={i.id} />
                    <input type="hidden" name="class_id" value={id} />
                    <SubmitButton className="btn" pendingLabel="…">
                      Remove
                    </SubmitButton>
                  </form>
                </li>
              ))}
            </ul>
          )}
          <form action={addClassInstructor} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="class_id" value={id} />
            <label className="field flex-1">
              <span>Name</span>
              <input className="input" name="name" maxLength={120} defaultValue="" />
            </label>
            <label className="field w-44">
              <span>Role</span>
              <select className="input" name="role" defaultValue="assistant">
                <option value="lead">Lead</option>
                <option value="assistant">Assistant</option>
                <option value="grader">Grader</option>
              </select>
            </label>
            <SubmitButton className="btn" pendingLabel="Adding…">
              + Credit Instructor
            </SubmitButton>
          </form>
          <p className="text-xs text-neutral-500">
            Credited names print on the results sheet. Separate instructor logins arrive in 0.2.0.
          </p>
        </div>
      </Collapsible>

      {courses.length > 0 && (
        <Collapsible scope={`class:${id}`} id="results" title="Results" defaultOpen summary="">
          <div className="space-y-6 p-4">
            {courses.map((c) => {
              const runs = classResults(db, id, c.cof_id);
              if (runs.length === 0) return null;
              return (
                <div key={c.cof_id} className="space-y-2">
                  <h3 className="text-xs tracking-widest text-neutral-400">{c.name}</h3>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Relay</th>
                        <th>Lane</th>
                        <th>Student</th>
                        <th>Attempt</th>
                        <th className="text-right">Points</th>
                        <th className="text-right">%</th>
                        <th>Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {runs.map((r) => (
                        <tr key={r.id}>
                          <td>{r.relay ?? "—"}</td>
                          <td>{r.lane ?? "—"}</td>
                          <td className="font-bold">{`${r.last_name}, ${r.first_name}`}</td>
                          <td>
                            {r.attempt}
                            {r.kind === "remedial" ? " · remedial" : ""}
                          </td>
                          <td className="text-right">{r.total_points ?? "—"}</td>
                          <td className="text-right">{r.final_score_percent?.toFixed(1) ?? "—"}</td>
                          <td>
                            <ResultBadge passed={r.passed === 1} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        </Collapsible>
      )}

      <form action={copyClass} className="flex flex-wrap items-end gap-3 border-t border-neutral-800 pt-4">
        <input type="hidden" name="id" value={id} />
        <label className="flex flex-col gap-1 text-sm">
          New class title
          <input className="input" name="title" defaultValue={`${klass.title}`} maxLength={140} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Date
          <input className="input" name="date" type="date" defaultValue={todayISO()} />
        </label>
        <SubmitButton className="btn btn-secondary" pendingLabel="Copying…">
          Duplicate Class
        </SubmitButton>
        <span className="text-xs text-neutral-500">
          Copies the courses of fire and credited instructors. The roster, relays and scores stay with this class.
        </span>
      </form>

      <form action={removeClass} className="pt-4">
        <input type="hidden" name="id" value={id} />
        <ConfirmSubmitButton
          className="btn btn-danger"
          confirmMessage={`Delete ${klass.title}? Every score recorded in this class is deleted too. This cannot be undone.`}
        >
          Delete Class
        </ConfirmSubmitButton>
      </form>
    </div>
  );
}
