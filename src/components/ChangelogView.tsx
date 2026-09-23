import { Fragment } from "react";
import type { ChangeVersion } from "@/lib/changelog";

function inline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <strong key={i} className="text-brand-amber">
        {p.slice(2, -2)}
      </strong>
    ) : (
      <Fragment key={i}>{p}</Fragment>
    )
  );
}

export default function ChangelogView({ versions }: { versions: ChangeVersion[] }) {
  return (
    <div className="flex flex-col gap-6">
      {versions.map((v) => (
        <section key={v.version} className="border border-neutral-800 bg-neutral-900 p-4">
          <h2 className="mb-2 text-brand-amber">
            {v.version} <span className="text-sm font-normal text-neutral-500">— {v.date}</span>
          </h2>
          {v.intro.map((t, i) => (
            <p key={i} className="mb-2 text-sm text-neutral-300">
              {inline(t)}
            </p>
          ))}
          {v.sections.map((s) => (
            <div key={s.title} className="mb-3">
              <h3 className="mb-1 text-xs text-neutral-400">{s.title}</h3>
              <ul className="ml-5 list-disc text-sm text-neutral-200">
                {s.items.map((it, i) => (
                  <li key={i} className="mb-0.5">
                    {inline(it.text)}
                    {it.children.length > 0 && (
                      <ul className="ml-5 list-[circle] text-neutral-300">
                        {it.children.map((c, j) => (
                          <li key={j}>{inline(c)}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
