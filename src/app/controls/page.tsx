import { getDb } from "@/lib/db";
import { getDropdownOptionRows } from "@/lib/db/dropdown-options";
import { DEFAULT_OPTIONS, DROPDOWN_CATEGORIES, DROPDOWN_USED_IN, type DropdownCategory } from "@/lib/options";
import { getSettings } from "@/lib/settings";
import HomeLayoutEditor from "@/components/HomeLayoutEditor";
import {
  addDropdownOption,
  deleteDropdownOption,
  moveDropdownOption,
  renameDropdownOption,
  restoreDropdownDefaults,
  sortDropdownAlpha,
} from "./actions";

export const dynamic = "force-dynamic";

const iconBtn = "border border-neutral-700 px-2 py-0.5 text-xs hover:bg-neutral-800 disabled:opacity-30";

export default async function ControlsPage({ searchParams }: { searchParams: Promise<{ open?: string }> }) {
  const { open } = await searchParams;
  const db = getDb();
  const settings = getSettings(db);
  const categories = Object.keys(DROPDOWN_CATEGORIES) as DropdownCategory[];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold">Controls</h1>
        <p className="text-sm text-neutral-400">
          Customize the home page and the options offered in dropdowns across the app. Backup, restore, course
          imports, and defaults live in Settings.
        </p>
      </div>

      <section className="border border-neutral-800 bg-neutral-900 p-4">
        <h2 className="mb-1 font-medium text-neutral-200">Home Page Layout</h2>
        <p className="mb-3 text-sm text-neutral-400">Choose which sections appear on the home page and in what order.</p>
        <HomeLayoutEditor initial={settings.home} />
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="font-medium text-neutral-200">Dropdown Lists</h2>
          <p className="text-sm text-neutral-400">
            Removing or renaming an option only changes future dropdown lists. It never changes anything already
            saved. Every dropdown still lets you type your own value.
          </p>
        </div>

        {categories.map((category) => {
          const rows = getDropdownOptionRows(db, category);
          const missingDefaults = DEFAULT_OPTIONS[category].filter((d) => !rows.some((r) => r.value === d)).length;
          return (
            <details
              key={category}
              id={`dd-${category}`}
              open={open === category}
              className="border border-neutral-800 bg-neutral-900 open:bg-neutral-900"
            >
              <summary className="flex cursor-pointer items-center justify-between gap-2 px-4 py-3">
                <span className="font-medium text-neutral-200">{DROPDOWN_CATEGORIES[category]}</span>
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
                        className="w-64 border border-neutral-700 bg-neutral-950 px-2 py-1 text-sm normal-case"
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
                    className="w-64 border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm normal-case"
                  />
                  <button type="submit" className="bg-blue-600 px-3 py-2 text-sm font-medium hover:bg-blue-500">
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
        })}
      </section>
    </div>
  );
}
