import { getDb } from "@/lib/db";
import { getDropdownOptionRows } from "@/lib/db/dropdown-options";
import { DEFAULT_OPTIONS, DROPDOWN_CATEGORIES, DROPDOWN_USED_IN, type DropdownCategory } from "@/lib/options";
import {
  addDropdownOption,
  deleteDropdownOption,
  moveDropdownOption,
  renameDropdownOption,
  restoreDropdownDefaults,
  sortDropdownAlpha,
} from "@/app/controls/actions";

const iconBtn = "btn btn-secondary btn-xs";

export default function DropdownListEditor({ category, open }: { category: DropdownCategory; open?: boolean }) {
  const db = getDb();
  const rows = getDropdownOptionRows(db, category);
  const missingDefaults = DEFAULT_OPTIONS[category].filter((d) => !rows.some((r) => r.value === d)).length;
  return (
            <details
              id={`dd-${category}`}
              data-section={`dd-${category}`}
              data-keywords={`${DROPDOWN_CATEGORIES[category]} list dropdown options ${DROPDOWN_USED_IN[category]}`.toLowerCase()}
              open={open}
              className="group border border-neutral-800 bg-neutral-900"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 [&::-webkit-details-marker]:hidden">
                <span className="flex items-center gap-3">
                  <span className="inline-block w-3 text-brand-amber transition-transform group-open:rotate-90">▸</span>
                  <span className="font-medium text-neutral-200">{DROPDOWN_CATEGORIES[category]} list</span>
                </span>
                <span className="text-xs text-neutral-500">
                  {rows.length} option{rows.length === 1 ? "" : "s"} · {DROPDOWN_USED_IN[category]}
                </span>
              </summary>
              <div className="flex flex-col gap-2 border-t border-neutral-800 p-4">
                {rows.map((r, i) => (
                  <div key={r.id} className="flex flex-wrap items-center gap-2">
                    <form action={renameDropdownOption.bind(null, category, r.id)} className="flex gap-1">
                      <input
                        name="value"
                        defaultValue={r.value}
                        className="input input-sm w-64"
                      />
                      <button type="submit" className={iconBtn} title="Save rename">
                        ✓
                      </button>
                    </form>
                    <form action={moveDropdownOption.bind(null, category, r.id, -1)}>
                      <button type="submit" className={iconBtn} disabled={i === 0} title="Move up">
                        ↑
                      </button>
                    </form>
                    <form action={moveDropdownOption.bind(null, category, r.id, 1)}>
                      <button type="submit" className={iconBtn} disabled={i === rows.length - 1} title="Move down">
                        ↓
                      </button>
                    </form>
                    <form action={deleteDropdownOption.bind(null, category, r.id)}>
                      <button type="submit" className={`${iconBtn} text-red-300`} aria-label={`Remove ${r.value}`}>
                        Remove
                      </button>
                    </form>
                  </div>
                ))}
                {rows.length === 0 && <p className="text-sm text-neutral-500">No options yet.</p>}

                <form action={addDropdownOption.bind(null, category)} className="mt-2 flex gap-2">
                  <input
                    name="value"
                    required
                    placeholder="Add a new option…"
                    className="input w-64"
                  />
                  <button type="submit" className="btn btn-primary">
                    Add
                  </button>
                </form>
                <div className="flex gap-2">
                  {rows.length > 1 && (
                    <form action={sortDropdownAlpha.bind(null, category)}>
                      <button type="submit" className={iconBtn}>
                        Sort A → Z
                      </button>
                    </form>
                  )}
                  {missingDefaults > 0 && (
                    <form action={restoreDropdownDefaults.bind(null, category)}>
                      <button type="submit" className={iconBtn}>
                        Restore {missingDefaults} default option{missingDefaults === 1 ? "" : "s"}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </details>
  );
}
