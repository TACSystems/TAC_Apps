import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { fd } from "@/lib/display";
import { passFail } from "@core/lib/cof-shared";
import { pickLabel } from "@/lib/ammo";
import { getSession, sessionNo, sessionOptions } from "@/lib/sessions";
import { pageSections } from "@core/lib/page-sections";
import { getDropdownOptions } from "@/lib/db/dropdown-options";
import Collapsible from "@core/components/Collapsible";
import SectionTools from "@core/components/SectionTools";
import ConfirmSubmitButton from "@core/components/ConfirmSubmitButton";
import SubmitButton from "@core/components/SubmitButton";
import SuggestInput from "@core/components/SuggestInput";
import ToastOnLoad from "@core/components/ToastOnLoad";
import { deletePractice, deleteSession, mergeInto, moveEntryAction, saveSession } from "../actions";

export const dynamic = "force-dynamic";

type Run = {
  id: string;
  cof_name: string | null;
  firearm_id: string | null;
  firearm: string | null;
  caliber: string | null;
  ammo_type: string | null;
  ammo_grain: number | null;
  ammo_manufacturer: string | null;
  rounds_fired: number | null;
  final_score_percent: number | null;
  passing_score_percent: number | null;
  weather_conditions: string | null;
};

type Practice = {
  id: string;
  firearm_id: string | null;
  firearm: string | null;
  rounds: number;
  caliber: string | null;
  ammo_type: string | null;
  ammo_grain: number | null;
  ammo_manufacturer: string | null;
  ammo_lot: string | null;
  deduct_from_ammo: number;
  notes: string | null;
};

const selectCls = "border border-neutral-700 bg-neutral-950 px-2 py-1 text-xs";

function ammoText(e: { caliber: string | null; ammo_type: string | null; ammo_grain: number | null; ammo_manufacturer: string | null }) {
  if (!e.caliber) return "—";
  if (!e.ammo_type && e.ammo_grain == null && !e.ammo_manufacturer) return `${e.caliber} · ammo not specified`;
  return pickLabel({ caliber: e.caliber, ammo_type: e.ammo_type, grain: e.ammo_grain, manufacturer: e.ammo_manufacturer });
}

export default async function SessionPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ done?: string }> }) {
  const { id } = await params;
  const { done = "" } = await searchParams;
  const db = getDb();
  const session = getSession(db, id);
  if (!session) notFound();

  const runs = db
    .prepare(
      `select r.*, c.name as cof_name, firearm_label(f.make_model, f.nickname) as firearm
       from range_log r left join courses_of_fire c on c.id = r.cof_id left join firearms f on f.id = r.firearm_id
       where r.session_id = ? order by r.created_at`
    )
    .all(id) as Run[];
  const practice = db
    .prepare(
      `select p.*, firearm_label(f.make_model, f.nickname) as firearm
       from rounds_fired_log p left join firearms f on f.id = p.firearm_id
       where p.session_id = ? order by p.created_at`
    )
    .all(id) as Practice[];
  const others = sessionOptions(db, id);
  const open = pageSections(db, "session");
  const locations = getDropdownOptions(db, "range_location");

  const byFirearm = new Map<string, { firearm: string; firearm_id: string | null; rounds: number; ammo: Set<string> }>();
  for (const e of [...runs.map((r) => ({ ...r, rounds: r.rounds_fired ?? 0 })), ...practice]) {
    const key = e.firearm_id ?? e.firearm ?? "none";
    const row = byFirearm.get(key) ?? { firearm: e.firearm ?? "No firearm linked", firearm_id: e.firearm_id, rounds: 0, ammo: new Set<string>() };
    row.rounds += e.rounds;
    if (e.caliber) row.ammo.add(ammoText(e));
    byFirearm.set(key, row);
  }
  const totalRounds = [...byFirearm.values()].reduce((s, r) => s + r.rounds, 0);
  const weather = [...new Set(runs.map((r) => r.weather_conditions).filter(Boolean))].join(", ");
  const qs = new URLSearchParams({ date: session.date, location: session.location ?? "" }).toString();
  const title = `Range Session ${sessionNo(session.number)}`;
  const optionLabel = (s: (typeof others)[number]) => `${sessionNo(s.number)} · ${fd(s.date)}${s.location ? ` · ${s.location}` : ""}`;

  const MoveForm = ({ table, entryId }: { table: "range_log" | "rounds_fired_log"; entryId: string }) => (
    <form action={moveEntryAction.bind(null, table, entryId, id)} className="flex items-center gap-1">
      <select name="target" defaultValue="" className={selectCls} aria-label="Move to session">
        <option value="" disabled>
          Move to…
        </option>
        <option value="new">A new session (same date)</option>
        {others.map((s) => (
          <option key={s.id} value={s.id}>
            {optionLabel(s)}
          </option>
        ))}
      </select>
      <SubmitButton pendingLabel="…" className="btn btn-secondary btn-xs">
        Move
      </SubmitButton>
    </form>
  );

  return (
    <div data-scope="session" className="flex max-w-5xl flex-col gap-4">
      {done.startsWith("saved") && <ToastOnLoad text="Session saved." />}
      {done.startsWith("merged") && <ToastOnLoad text="Sessions merged." />}
      {done.startsWith("moved") && <ToastOnLoad text="Entry moved." />}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/range-log" className="text-xs text-brand-amber hover:text-brand-amber-light">
            ← Range Log
          </Link>
          <h1 className="text-xl font-semibold">{title}</h1>
          <p className="text-sm text-neutral-400">
            {fd(session.date)}
            {session.location ? ` · ${session.location}` : ""} · {totalRounds.toLocaleString()} rounds
            {weather ? ` · ${weather}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/range-log/new?mode=course&${qs}`} className="btn btn-secondary">
            + Course Run
          </Link>
          <Link href={`/range-day?${qs}`} className="btn btn-secondary">
            + Practice
          </Link>
        </div>
      </div>

      <SectionTools scope="session" remember />

      <Collapsible
        id="summary"
        scope="session"
        title="Summary"
        defaultOpen={open("summary", true)}
        summary={`${byFirearm.size} firearm${byFirearm.size === 1 ? "" : "s"} · ${totalRounds.toLocaleString()} rds`}
      >
        <div className="flex flex-col gap-1 text-sm">
          {[...byFirearm.values()].map((f) => (
            <div key={f.firearm_id ?? f.firearm} className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800/60 py-1">
              <span>
                {f.firearm_id ? (
                  <Link href={`/inventory/${f.firearm_id}`} className="text-brand-amber hover:text-brand-amber-light">
                    {f.firearm}
                  </Link>
                ) : (
                  f.firearm
                )}
                {f.ammo.size > 0 && <span className="text-xs text-neutral-500"> · {[...f.ammo].join(", ")}</span>}
              </span>
              <span>{f.rounds.toLocaleString()} rds</span>
            </div>
          ))}
          {byFirearm.size === 0 && <p className="text-neutral-500">Nothing logged in this session.</p>}
          {session.notes && <p className="mt-2 whitespace-pre-line text-neutral-400">{session.notes}</p>}
        </div>
      </Collapsible>

      <Collapsible
        id="runs"
        scope="session"
        title="Course Runs"
        defaultOpen={open("runs", true)}
        summary={
          runs.length
            ? runs.map((r) => `${r.cof_name ?? "Course"} ${r.final_score_percent != null ? `${r.final_score_percent}%` : ""}`).join(" · ")
            : "None"
        }
      >
        <div className="flex flex-col gap-2">
          {runs.map((r) => {
            const result = passFail(r.final_score_percent, r.passing_score_percent);
            return (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm">
                <Link href={`/range-log/${r.id}`} className="flex-1 hover:text-brand-amber">
                  <span className="font-medium">{r.cof_name ?? "Course run"}</span>
                  <span className="text-neutral-400">
                    {" "}
                    · {r.firearm ?? "No firearm"} · {(r.rounds_fired ?? 0).toLocaleString()} rds · {ammoText(r)}
                  </span>
                </Link>
                <span className="flex items-center gap-3">
                  <span>
                    {r.final_score_percent != null ? `${r.final_score_percent}%` : "—"}
                    {result && <span className={`ml-1 text-xs ${result === "PASS" ? "text-green-400" : "text-red-400"}`}>{result}</span>}
                  </span>
                  <MoveForm table="range_log" entryId={r.id} />
                </span>
              </div>
            );
          })}
          {runs.length === 0 && (
            <p className="text-sm text-neutral-500">
              No course runs.{" "}
              <Link href={`/range-log/new?mode=course&${qs}`} className="text-brand-amber hover:text-brand-amber-light">
                Add one
              </Link>
              .
            </p>
          )}
        </div>
      </Collapsible>

      <Collapsible
        id="practice"
        scope="session"
        title="Practice"
        defaultOpen={open("practice", true)}
        summary={practice.length ? `${practice.length} entr${practice.length === 1 ? "y" : "ies"} · ${practice.reduce((s, p) => s + p.rounds, 0).toLocaleString()} rds` : "None"}
      >
        <div className="flex flex-col gap-2">
          {practice.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm">
              <span className="flex-1">
                {p.firearm_id ? (
                  <Link href={`/inventory/${p.firearm_id}`} className="text-brand-amber hover:text-brand-amber-light">
                    {p.firearm}
                  </Link>
                ) : (
                  p.firearm ?? "No firearm"
                )}
                <span className="text-neutral-400">
                  {" "}
                  · {p.rounds.toLocaleString()} rds · {ammoText(p)}
                  {p.ammo_lot ? ` · Lot ${p.ammo_lot}` : ""}
                  {!p.deduct_from_ammo ? " · not deducted from ammo" : ""}
                  {p.notes ? ` · ${p.notes}` : ""}
                </span>
              </span>
              <span className="flex items-center gap-3">
                <MoveForm table="rounds_fired_log" entryId={p.id} />
                <form action={deletePractice.bind(null, p.id, id)}>
                  <ConfirmSubmitButton
                    confirmMessage={`Remove this entry? ${p.rounds} rounds come off ${p.firearm ?? "the firearm"}'s count${p.deduct_from_ammo ? " and go back to ammo on hand" : ""}.`}
                    className="btn-link btn-link-danger text-xs"
                  >
                    Remove
                  </ConfirmSubmitButton>
                </form>
              </span>
            </div>
          ))}
          {practice.length === 0 && (
            <p className="text-sm text-neutral-500">
              No practice entries.{" "}
              <Link href={`/range-day?${qs}`} className="text-brand-amber hover:text-brand-amber-light">
                Add practice
              </Link>
              .
            </p>
          )}
        </div>
      </Collapsible>

      <Collapsible id="edit" scope="session" title="Edit Session" defaultOpen={open("edit", false)} summary="Date, location, notes, merge, delete">
        <div className="flex flex-col gap-5">
          <form action={saveSession.bind(null, id)} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="req">Date</span>
              <input type="date" name="date" required defaultValue={session.date} className="input" />
            </label>
            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
              Range / Location
              <SuggestInput name="location" listId="session-locations" options={locations} defaultValue={session.location} className="border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm" />
            </label>
            <label className="flex flex-col gap-1 text-sm sm:col-span-3">
              Notes
              <textarea name="notes" rows={2} defaultValue={session.notes ?? ""} className="input" />
            </label>
            <p className="text-xs text-neutral-500 sm:col-span-3">Changing the date or location updates every entry in this session.</p>
            <SubmitButton className="btn btn-primary w-fit">Save Session</SubmitButton>
          </form>

          {others.length > 0 && (
            <form action={mergeInto.bind(null, id)} className="flex flex-wrap items-end gap-2 border-t border-neutral-800 pt-4">
              <label className="flex flex-col gap-1 text-sm">
                <span className="req">Merge this session into</span>
                <select name="target" required defaultValue="" className="input">
                  <option value="" disabled>
                    Pick a session…
                  </option>
                  {others.map((s) => (
                    <option key={s.id} value={s.id}>
                      {optionLabel(s)}
                    </option>
                  ))}
                </select>
              </label>
              <ConfirmSubmitButton
                confirmMessage={`Merge ${title} into the session you picked? Its entries move there and take that session's date and location, and ${sessionNo(session.number)} goes away.`}
                className="btn btn-secondary"
              >
                Merge
              </ConfirmSubmitButton>
            </form>
          )}

          <form action={deleteSession.bind(null, id)} className="border-t border-neutral-800 pt-4">
            <ConfirmSubmitButton
              confirmMessage={`Delete ${title} and everything in it (${runs.length} course run${runs.length === 1 ? "" : "s"}, ${practice.length} practice entr${practice.length === 1 ? "y" : "ies"})? The rounds come off each firearm's count and go back to ammo on hand. This cannot be undone.`}
              className="btn btn-danger"
            >
              Delete Session
            </ConfirmSubmitButton>
          </form>
        </div>
      </Collapsible>
    </div>
  );
}
