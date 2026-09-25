import PageHeader from "@core/components/PageHeader";
import Collapsible from "@core/components/Collapsible";
import SubmitButton from "@core/components/SubmitButton";
import ConfirmSubmitButton from "@core/components/ConfirmSubmitButton";
import { getDb } from "@/lib/db";
import { listTargetTypes, loadTargetType } from "@core/lib/cof";
import { removeTarget, saveTarget } from "./actions";

export const dynamic = "force-dynamic";

function ZoneRows({ zones }: { zones: { zone_label: string; value: number }[] }) {
  const rows = [...zones, ...Array.from({ length: Math.max(0, 8 - zones.length) }, () => null)];
  return (
    <div className="grid gap-2 sm:grid-cols-4">
      {rows.map((z, i) => (
        <div key={i} className="flex gap-2">
          <input
            className="input w-full"
            name="zone_label"
            defaultValue={z?.zone_label ?? ""}
            placeholder="Zone"
            maxLength={12}
            aria-label={`Zone ${i + 1} label`}
          />
          <input
            className="input w-24"
            name="zone_value"
            type="number"
            step="0.5"
            defaultValue={z?.value ?? ""}
            placeholder="Pts"
            aria-label={`Zone ${i + 1} points`}
          />
        </div>
      ))}
    </div>
  );
}

export default async function TargetsPage() {
  const db = getDb();
  const targets = listTargetTypes(db);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Target Types"
        subtitle="Scoring zones and their point values. A course needs one before it can be scored."
      />

      {targets.map((t) => {
        const full = loadTargetType(db, t.id);
        return (
          <Collapsible
            key={t.id}
            scope="targets"
            id={`target-${t.id}`}
            title={t.name}
            defaultOpen={false}
            summary={`${full?.zones.length ?? 0} zones · ${t.course_count} course${t.course_count === 1 ? "" : "s"}`}
          >
            <div className="space-y-4 p-4">
              <form action={saveTarget} className="space-y-4">
                <input type="hidden" name="id" value={t.id} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="field">
                    <span className="req">Name</span>
                    <input className="input" name="name" defaultValue={t.name} required maxLength={80} />
                  </label>
                  <label className="field">
                    <span>Description</span>
                    <input className="input" name="description" defaultValue={t.description ?? ""} maxLength={300} />
                  </label>
                </div>
                <div className="space-y-2">
                  <span className="text-xs tracking-widest text-neutral-400">Zones, highest value first</span>
                  <ZoneRows zones={full?.zones ?? []} />
                </div>
                <SubmitButton className="btn btn-primary" pendingLabel="Saving…">
                  Save Target Type
                </SubmitButton>
              </form>

              <form action={removeTarget}>
                <input type="hidden" name="id" value={t.id} />
                <ConfirmSubmitButton className="btn btn-danger" confirmMessage={`Delete ${t.name}?`}>
                  Delete
                </ConfirmSubmitButton>
              </form>
            </div>
          </Collapsible>
        );
      })}

      <Collapsible scope="targets" id="new-target" title="Add a Target Type" defaultOpen={targets.length === 0} summary="">
        <form action={saveTarget} className="space-y-4 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="field">
              <span className="req">Name</span>
              <input className="input" name="name" required maxLength={80} placeholder="Q Target" />
            </label>
            <label className="field">
              <span>Description</span>
              <input className="input" name="description" maxLength={300} />
            </label>
          </div>
          <div className="space-y-2">
            <span className="text-xs tracking-widest text-neutral-400">Zones, highest value first</span>
            <ZoneRows zones={[]} />
          </div>
          <SubmitButton className="btn btn-primary" pendingLabel="Saving…">
            Add Target Type
          </SubmitButton>
        </form>
      </Collapsible>
    </div>
  );
}
