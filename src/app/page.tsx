import Link from "next/link";
import Collapsible from "@/components/Collapsible";
import DocStateBadge from "@/components/DocStateBadge";
import { expiringDocuments } from "@/lib/documents";
import SectionTools from "@/components/SectionTools";
import CategorizeBanner from "@/components/CategorizeBanner";
import TourOffer from "@/components/TourOffer";
import FirstRun from "@/components/FirstRun";
import { Suspense } from "react";
import { securityMode } from "@/lib/security-state";
import { categorizePromptVisible } from "@/lib/course-category-store";
import { getDb } from "@/lib/db";
import type { RangeLog } from "@/lib/db/types";
import { maintenanceSchedule, STATUS_LABEL, type MaintenanceStatus } from "@/lib/maintenance";
import { getSettings, type HomeSectionKey } from "@/lib/settings";
import { ammoStatus } from "@/lib/ammo";
import { logMaintenance } from "@/app/inventory/[id]/log-actions";
import SubmitButton from "@/components/SubmitButton";
import { label, fd } from "@/lib/display";
import { todayISO } from "@/lib/settings-shared";

const STATUS_CLASS: Record<MaintenanceStatus, string> = {
  due: "border-red-800 bg-red-950 text-red-300",
  soon: "border-amber-700 bg-amber-950 text-amber-300",
  ok: "border-neutral-700 text-neutral-300",
  unset: "border-neutral-800 text-neutral-500",
};

function Meter({ pct }: { pct: number | null }) {
  if (pct == null) return null;
  const w = Math.min(100, Math.round(pct * 100));
  const color = pct >= 1 ? "bg-red-500" : pct >= 0.8 ? "bg-amber-500" : "bg-brand-amber";
  return (
    <div className="mt-1 h-1 w-full bg-neutral-800">
      <div className={`h-1 ${color}`} style={{ width: `${w}%` }} />
    </div>
  );
}

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const db = getDb();

  const firearmCount = db
    .prepare(`select count(*) as n from firearms where status = 'active'`)
    .get() as { n: number };

  const settings = getSettings(db);
  const layout = settings.home;
  const collapsed = new Set(settings.dashboardCollapsed);
  const expiring = expiringDocuments(db, settings.docWarnDays, settings.docUrgentDays);
  const docCount = (db.prepare(`select count(*) as n from documents`).get() as { n: number }).n;
  const schedule = maintenanceSchedule(db, {
    soonThreshold: settings.dueSoonPercent / 100,
    includeStored: layout.includeStored,
  });
  const scheduleShown = layout.maintenanceDueOnly
    ? schedule.filter((m) => m.status === "due" || m.status === "soon")
    : schedule;
  const dueCount = schedule.filter((m) => m.status === "due").length;
  const soonCount = schedule.filter((m) => m.status === "soon").length;
  const today = todayISO();
  const ammo = ammoStatus(db, settings.lowAmmoPercent, true);

  const courseCount = db.prepare(`select count(*) as n from courses_of_fire`).get() as { n: number };

  const logs = db
    .prepare(
      `select rl.*, c.name as cof_name, firearm_label(f.make_model, f.nickname) as firearm_make_model
       from range_log rl
       left join courses_of_fire c on c.id = rl.cof_id
       left join firearms f on f.id = rl.firearm_id
       order by rl.date desc, rl.created_at desc
       limit ?`
    )
    .all(layout.recentCount) as (RangeLog & { cof_name: string | null; firearm_make_model: string | null })[];

  const sections: Record<HomeSectionKey, React.ReactNode> = {
    quick_actions: (
      <section data-tour="quick-actions" className="flex flex-wrap gap-2">
        <Link href="/range-log/new" className="bg-brand-olive px-4 py-2 text-sm font-medium hover:bg-brand-olive-light">
          Log a Range Session
        </Link>
        <Link href="/courses/new" className="border border-neutral-700 px-4 py-2 text-sm hover:bg-neutral-800">
          Build a Course of Fire
        </Link>
        <Link href="/inventory" className="border border-neutral-700 px-4 py-2 text-sm hover:bg-neutral-800">
          Update Rounds Fired
        </Link>
        <Link href="/ammo" className="border border-neutral-700 px-4 py-2 text-sm hover:bg-neutral-800">
          Log Ammo Purchase
        </Link>
      </section>
    ),
    search: (
      <form action="/search" className="flex gap-2">
        <input
          name="q"
          placeholder="Search firearms, ammo, courses, range log…"
          className="w-full max-w-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm normal-case"
        />
        <button
          type="submit"
          className="border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm hover:bg-neutral-700"
        >
          Search
        </button>
      </form>
    ),
    maintenance: (
      <Collapsible
        id="maintenance"
        title="Maintenance Schedule"
        persist
        defaultOpen={!collapsed.has("maintenance")}
        aside={
          dueCount > 0 || soonCount > 0
            ? `${dueCount} due · ${soonCount} due soon`
            : schedule.length > 0
              ? "Everything is within schedule"
              : ""
        }
      >
        {scheduleShown.length === 0 ? (
          <p className="text-sm text-neutral-500">
            {schedule.length === 0 ? (
              <>
                No firearms in the armory yet.{" "}
                <Link href="/inventory/new" className="text-brand-amber hover:text-brand-amber-light">
                  Add one
                </Link>
                .
              </>
            ) : (
              "Nothing is due or due soon."
            )}
          </p>
        ) : (
          <div className="overflow-x-auto border border-neutral-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-900 text-xs text-neutral-400">
                <tr>
                  <th className="px-3 py-2">Firearm</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Rounds Since Clean</th>
                  <th className="px-3 py-2">Last Cleaned</th>
                  <th className="px-3 py-2">Next Due</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {scheduleShown.map((m) => (
                  <tr key={m.firearm.id} className="border-t border-neutral-800 align-top">
                    <td className="px-3 py-2">
                      <Link href={`/inventory/${m.firearm.id}`} className="hover:text-brand-amber-light">
                        {label(m.firearm)}
                      </Link>
                      <div className="text-xs text-neutral-500">
                        {m.firearm.caliber ?? ""}
                        {m.firearm.status === "stored" ? " · stored" : ""}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`border px-2 py-0.5 text-xs tracking-wider ${STATUS_CLASS[m.status]}`}>
                        {STATUS_LABEL[m.status]}
                      </span>
                    </td>
                    <td className="w-44 px-3 py-2">
                      {m.roundsSince}
                      {m.firearm.clean_interval_rounds ? ` / ${m.firearm.clean_interval_rounds}` : ""}
                      <Meter pct={m.roundsPct} />
                    </td>
                    <td className="px-3 py-2">
                      {fd(m.lastCleanedDate) || <span className="text-neutral-500">Never logged</span>}
                      {m.daysSince != null && (
                        <div className="text-xs text-neutral-500">{m.daysSince} {m.daysSince === 1 ? "day" : "days"} ago</div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {m.nextDueDate || m.roundsRemaining != null ? (
                        <>
                          {m.nextDueDate && <div>{fd(m.nextDueDate)}</div>}
                          {m.roundsRemaining != null && (
                            <div className="text-xs text-neutral-500">
                              {m.roundsRemaining > 0
                                ? `or in ${m.roundsRemaining} rounds`
                                : `${-m.roundsRemaining} rounds over`}
                            </div>
                          )}
                          <Meter pct={m.daysPct} />
                        </>
                      ) : (
                        <Link
                          href={`/inventory/${m.firearm.id}`}
                          className="text-xs text-brand-amber hover:text-brand-amber-light"
                        >
                          Set a cleaning interval
                        </Link>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <form action={logMaintenance.bind(null, m.firearm.id)}>
                        <input type="hidden" name="date" value={today} />
                        <input type="hidden" name="type" value="Cleaning" />
                        <SubmitButton
                          pendingLabel="Logging…"
                          className="whitespace-nowrap border border-neutral-700 px-2 py-1 text-xs hover:bg-neutral-800"
                        >
                          Log Cleaning
                        </SubmitButton>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Collapsible>
    ),
    ammo: (
      <Collapsible
        id="ammo"
        title="Ammo On Hand"
        persist
        defaultOpen={!collapsed.has("ammo")}
        aside={
          <Link href="/ammo" className="text-sm text-brand-amber hover:text-brand-amber-light">
            Ammo tracking →
          </Link>
        }
      >
        {ammo.length === 0 ? (
          <p className="text-sm text-neutral-500">
            No ammo goals set yet.{" "}
            <Link href="/ammo" className="text-brand-amber hover:text-brand-amber-light">
              Set a goal per caliber
            </Link>{" "}
            to track it here.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {ammo.map((a) => {
              const pct = a.pct != null ? Math.min(100, Math.max(0, Math.round(a.pct * 100))) : 0;
              return (
                <div
                  key={a.caliber}
                  className={`border bg-neutral-900 p-3 ${a.low ? "border-red-900" : "border-neutral-800"}`}
                >
                  <div className="text-xs text-neutral-400">{a.caliber}</div>
                  <div className={`text-xl ${a.low ? "text-red-300" : ""}`}>{a.on_hand.toLocaleString()}</div>
                  <div className="text-xs text-neutral-500">
                    of {a.goal?.toLocaleString()} goal · {pct}%{a.low ? " · LOW" : ""}
                  </div>
                  <div className="mt-1 h-1 w-full bg-neutral-800">
                    <div className={`h-1 ${a.low ? "bg-red-500" : "bg-brand-amber"}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Collapsible>
    ),
    recent_sessions: (
      <Collapsible
        id="recent_sessions"
        title="Recent Range Sessions"
        persist
        defaultOpen={!collapsed.has("recent_sessions")}
        aside={
          <Link href="/range-log" className="text-sm text-brand-amber hover:text-brand-amber-light">
            View all →
          </Link>
        }
      >
        <div className="flex flex-col gap-2">
          {logs.map((l) => (
            <Link
              key={l.id}
              href={`/range-log/${l.id}`}
              className="flex items-center justify-between border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm hover:border-neutral-600"
            >
              <span>
                {fd(l.date)} · {l.firearm_make_model ?? "—"} · {l.cof_name ?? "Unlisted course"}
              </span>
              <span className="text-neutral-400">
                {l.final_score_percent != null ? `${l.final_score_percent}%` : "—"}
              </span>
            </Link>
          ))}
          {logs.length === 0 && (
            <p className="text-sm text-neutral-500">No range sessions logged yet.</p>
          )}
        </div>
      </Collapsible>
    ),
    documents: (
      <Collapsible
        id="documents"
        title="Permits & Documents"
        persist
        defaultOpen={!collapsed.has("documents")}
        aside={
          <Link href="/documents" className="text-sm text-brand-amber hover:text-brand-amber-light">
            All documents →
          </Link>
        }
      >
        {docCount === 0 ? (
          <p className="text-sm text-neutral-500">
            Track carry permits, NFA stamps, and memberships to get a warning before they expire.{" "}
            <Link href="/documents/new" className="text-brand-amber hover:text-brand-amber-light">
              Add one
            </Link>
            .
          </p>
        ) : expiring.length === 0 ? (
          <p className="text-sm text-neutral-500">
            {docCount} document{docCount === 1 ? "" : "s"} on file. Nothing expires in the next {settings.docWarnDays} days.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {expiring.map((d) => (
              <Link
                key={d.id}
                href={`/documents/${d.id}`}
                className="flex flex-wrap items-center justify-between gap-2 border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm hover:border-neutral-600"
              >
                <span>
                  {d.title} <span className="text-neutral-500">· {d.doc_type}</span>
                </span>
                <DocStateBadge state={d.state} days={d.days} />
              </Link>
            ))}
          </div>
        )}
      </Collapsible>
    ),
  };

  return (
    <div data-scope="dashboard" className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{settings.userName ? `Welcome back, ${settings.userName}` : "Welcome back"}</h1>
          <p className="text-neutral-400">
            {firearmCount.n} firearm{firearmCount.n === 1 ? "" : "s"} in the armory · {courseCount.n}{" "}
            course{courseCount.n === 1 ? "" : "s"} of fire on file.
          </p>
        </div>
        <SectionTools scope="dashboard" persist />
      </div>
      <CategorizeBanner count={categorizePromptVisible(db)} />
      {settings.tourStatus === "offer" && <TourOffer />}
      <Suspense fallback={null}>
        <FirstRun status={settings.tourStatus} canSetPin={securityMode() === "none"} />
      </Suspense>
      {layout.sections
        .filter((sec) => sec.visible)
        .map((sec) => (
          <div key={sec.key}>{sections[sec.key]}</div>
        ))}
    </div>
  );
}
