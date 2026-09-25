import Link from "next/link";
import { fd } from "@/lib/display";
import { sessionNo } from "@/lib/sessions";
import type { RangeLog, CourseOfFire } from "@/lib/db/types";

type SessionRow = { id: string; number: number; date: string; location: string | null; rounds: number };

export default function SessionsSection({ sessions, logs }: { sessions: SessionRow[]; logs: (RangeLog & { cof_name: CourseOfFire["name"] | null })[] }) {
  return (
    <>
        <div className="flex flex-col gap-2">
          {sessions.map((sn) => {
            const runs = logs.filter((l) => l.session_id === sn.id);
            return (
              <Link
                key={sn.id}
                href={`/range-log/session/${sn.id}`}
                className="flex flex-wrap items-center justify-between gap-2 border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm hover:border-neutral-600"
              >
                <span>
                  <span className="text-brand-amber">{sessionNo(sn.number)}</span> · {fd(sn.date)}
                  {sn.location ? ` · ${sn.location}` : ""} · {sn.rounds.toLocaleString()} rds
                </span>
                <span className="text-neutral-400">
                  {runs.map((l) => `${l.cof_name ?? "Course"} ${l.final_score_percent != null ? `${l.final_score_percent}%` : ""}`).join(" · ")}
                </span>
              </Link>
            );
          })}
          {sessions.length === 0 && <p className="text-sm text-neutral-500">No range sessions with this firearm yet.</p>}
        </div>
          </>
  );
}
