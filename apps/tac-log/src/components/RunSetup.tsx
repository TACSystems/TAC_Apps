import Link from "next/link";
import PageHeader from "@core/components/PageHeader";
import type { ArmoryPick } from "@/lib/previous-runs";

/**
 * Run Course is gated on choosing a firearm, because the rounds it tallies
 * are posted to that firearm's record and a shots-fired count is only worth
 * having if it is right. "Not in my Armory" is a real answer — a borrowed or
 * rented gun still shoots the course — and it records no rounds against
 * anything rather than guessing.
 */
export default function RunSetup({
  courseId,
  courseName,
  rounds,
  armory,
  lastUsed,
}: {
  courseId: string;
  courseName: string;
  rounds: number;
  armory: ArmoryPick[];
  lastUsed: string | null;
}) {
  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <PageHeader
        title="Run Course"
        icon="timer"
        subtitle={`${courseName} · ${rounds} rounds`}
        back={{ href: `/courses/${courseId}`, label: "Course" }}
      />

      <section className="card brk space-y-4 p-5">
        <div>
          <h2 className="text-lg font-bold uppercase tracking-wide">Which firearm?</h2>
          <p className="text-sm text-neutral-400">
            The rounds this course fires are added to the firearm you pick, so its shots-fired count and cleaning
            schedule stay right.
          </p>
        </div>

        <div className="grid gap-2">
          {armory.map((f) => (
            <Link
              key={f.id}
              href={`/run/${courseId}?firearm=${f.id}`}
              className="flex items-baseline justify-between gap-4 border border-neutral-700 px-4 py-3 hover:border-brand-amber"
            >
              <span>
                <span className="font-bold">{f.label}</span>
                {f.id === lastUsed ? (
                  <span className="ml-3 text-[10px] uppercase tracking-widest text-brand-amber">Last used here</span>
                ) : null}
                <span className="block text-xs text-neutral-500">
                  {[f.caliber, `${f.shots_fired.toLocaleString()} rounds fired`].filter(Boolean).join(" · ")}
                </span>
              </span>
              <span className="text-xs uppercase tracking-widest text-neutral-500">Run →</span>
            </Link>
          ))}

          <Link
            href={`/run/${courseId}?firearm=none`}
            className="flex items-baseline justify-between gap-4 border border-dashed border-neutral-700 px-4 py-3 hover:border-brand-amber"
          >
            <span>
              <span className="font-bold">Firearm not in my Armory</span>
              <span className="block text-xs text-neutral-500">
                Borrowed, rented or someone else&apos;s. No rounds are recorded against any firearm.
              </span>
            </span>
            <span className="text-xs uppercase tracking-widest text-neutral-500">Run →</span>
          </Link>
        </div>

        {armory.length === 0 ? (
          <p className="text-sm text-neutral-500">
            Nothing in the Armory yet. You can still run the course — pick the option above.
          </p>
        ) : null}
      </section>
    </div>
  );
}
