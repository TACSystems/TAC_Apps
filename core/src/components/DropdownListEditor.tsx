import type { DropdownRow, DropdownActions } from "@core/lib/dropdowns";

const iconBtn = "btn btn-secondary btn-xs";

/**
 * One dropdown list, editable. The app supplies its rows, its labels and its
 * own server actions — core never reaches for a database.
 */
export default function DropdownListEditor<C extends string>({
  category,
  label,
  usedIn,
  rows,
  missingDefaults,
  actions,
  open,
}: {
  category: C;
  label: string;
  usedIn: string;
  rows: DropdownRow[];
  missingDefaults: number;
  actions: DropdownActions<C>;
  open?: boolean;
}) {
  const {
    addDropdownOption,
    deleteDropdownOption,
    moveDropdownOption,
    renameDropdownOption,
    restoreDropdownDefaults,
    sortDropdownAlpha,
  } = actions;
  return (
            <details
              id={`dd-${category}`}
              data-section={`dd-${category}`}
              data-keywords={`${label} list dropdown options ${usedIn}`.toLowerCase()}
              open={open}
              className="group border border-neutral-800 bg-neutral-900"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 [&::-webkit-details-marker]:hidden">
                <span className="flex items-center gap-3">
                  <span className="inline-block w-3 text-brand-amber transition-transform group-open:rotate-90">▸</span>
                  <span className="font-medium text-neutral-200">{label} list</span>
                </span>
                <span className="text-xs text-neutral-500">
                  {rows.length} option{rows.length === 1 ? "" : "s"} · {usedIn}
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
