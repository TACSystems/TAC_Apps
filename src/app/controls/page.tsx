import { getDb } from "@/lib/db";
import { getDropdownOptionRows } from "@/lib/db/dropdown-options";
import { DROPDOWN_CATEGORIES, type DropdownCategory } from "@/lib/options";
import { addDropdownOption, deleteDropdownOption } from "./actions";

export const dynamic = "force-dynamic";

export default function ControlsPage() {
  const db = getDb();
  const categories = Object.keys(DROPDOWN_CATEGORIES) as DropdownCategory[];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold">Controls</h1>
        <p className="text-sm text-neutral-400">
          Manage the options offered in dropdowns across the app. Removing an option only
          removes it from future dropdown lists — it never changes anything already saved.
        </p>
      </div>

      <section className="border border-neutral-800 bg-neutral-900 p-4">
        <h2 className="mb-2 font-medium text-neutral-200">Backup</h2>
        <p className="mb-3 text-sm text-neutral-400">
          Everything lives in one local file. Download a copy whenever you want — there is no
          automatic cloud backup by design.
        </p>
        <a
          href="/api/export"
          className="inline-block border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm hover:bg-neutral-700"
        >
          Export Database
        </a>
      </section>

      {categories.map((category) => {
        const rows = getDropdownOptionRows(db, category);
        const addAction = addDropdownOption.bind(null, category);

        return (
          <section key={category} className="rounded border border-neutral-800 bg-neutral-900 p-4">
            <h2 className="mb-3 font-medium text-neutral-200">{DROPDOWN_CATEGORIES[category]}</h2>

            <div className="mb-3 flex flex-wrap gap-2">
              {rows.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-2 rounded-full border border-neutral-700 bg-neutral-950 px-3 py-1 text-sm"
                >
                  <span>{r.value}</span>
                  <form action={deleteDropdownOption.bind(null, r.id)}>
                    <button
                      type="submit"
                      aria-label={`Remove ${r.value}`}
                      className="text-neutral-500 hover:text-red-400"
                    >
                      ×
                    </button>
                  </form>
                </div>
              ))}
              {rows.length === 0 && (
                <p className="text-sm text-neutral-500">No options yet.</p>
              )}
            </div>

            <form action={addAction} className="flex gap-2">
              <input
                name="value"
                required
                placeholder="Add a new option…"
                className="flex-1 rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="rounded bg-blue-600 px-3 py-2 text-sm font-medium hover:bg-blue-500"
              >
                Add
              </button>
            </form>
          </section>
        );
      })}
    </div>
  );
}
