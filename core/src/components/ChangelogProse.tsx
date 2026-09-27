import type { ProseVersion } from "@core/lib/changelog-prose";

export default function ChangelogProse({
  versions,
  currentVersion,
}: {
  versions: ProseVersion[];
  currentVersion?: string | null;
}) {
  if (versions.length === 0) {
    return <p className="text-sm text-neutral-400">No release notes are bundled with this build.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      {versions.map((v) => (
        <section key={v.version} id={`v${v.version}`} className="card p-4">
          <div className="mb-2 flex flex-wrap items-baseline gap-3">
            <h2 className="num text-lg font-bold">{v.version}</h2>
            {v.date && <span className="text-xs tracking-widest text-neutral-500">{v.date}</span>}
            {currentVersion === v.version && (
              <span className="border border-brand-amber px-2 py-0.5 text-[10px] tracking-widest text-brand-amber">
                Installed
              </span>
            )}
          </div>

          {v.intro && <p className="mb-3 text-sm normal-case leading-relaxed text-neutral-300">{v.intro}</p>}

          <ul className="flex flex-col gap-3">
            {v.notes.map((n, i) => (
              <li key={i} className="text-sm normal-case leading-relaxed text-neutral-300">
                {n.lead && <span className="font-bold text-neutral-100">{n.lead}. </span>}
                {n.body}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
