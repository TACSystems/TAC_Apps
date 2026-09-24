import type { ReactNode } from "react";
import { getDb } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getDropdownOptions } from "@/lib/db/dropdown-options";
import { ammoStatus } from "@/lib/ammo";
import type { DropdownCategory } from "@/lib/options";
import HomeLayoutEditor from "@/components/HomeLayoutEditor";
import DropdownListEditor from "@/components/DropdownListEditor";
import Collapsible from "@/components/Collapsible";
import SectionTools from "@/components/SectionTools";
import BulkCounts from "@/components/BulkCounts";
import { AmmoDefaultsForm, DocumentWarningsForm, MaintenanceDefaultsForm, RangeDefaultsForm } from "@/components/SettingsForms";

export const dynamic = "force-dynamic";

function Group({ id, title, blurb, children }: { id: string; title: string; blurb: string; children: ReactNode }) {
  return (
    <section id={id} className="flex flex-col gap-2">
      <div className="mt-3 flex items-baseline gap-3 border-b border-neutral-800 pb-1">
        <h2 className="text-base text-brand-amber">{title}</h2>
        <span className="text-xs text-neutral-500">{blurb}</span>
      </div>
      {children}
    </section>
  );
}

export default async function ControlsPage({ searchParams }: { searchParams: Promise<{ open?: string; saved?: string }> }) {
  const { open, saved } = await searchParams;
  const db = getDb();
  const s = getSettings(db);
  const list = (c: DropdownCategory) => <DropdownListEditor key={c} category={c} open={open === c} />;
  const firearms = (
    db
      .prepare(`select id, shots_fired, firearm_label(make_model, nickname) as label from firearms where status != 'sold' order by make_model`)
      .all() as { id: string; shots_fired: number; label: string }[]
  ).map((f) => ({ key: f.id, label: f.label, current: f.shots_fired }));
  const calibers = ammoStatus(db, s.lowAmmoPercent).map((a) => ({ key: a.caliber, label: a.caliber, current: a.on_hand }));
  const ret = "/controls";

  return (
    <div data-scope="controls" className="flex max-w-5xl flex-col gap-3">
      <div>
        <h1 className="text-xl font-semibold">Controls</h1>
        <p className="text-sm text-neutral-400">
          Customize each page of TAC-LOG: its dropdown lists, defaults, and layout. App-wide things (security, backups,
          import/export, display) live in Settings.
        </p>
      </div>
      <SectionTools scope="controls" search />

      <Group id="page-home" title="Home" blurb="The dashboard">
        <Collapsible id="controls-home-layout" title="Dashboard Layout" keywords="home page sections order show hide recent sessions" defaultOpen={saved === "home"}>
          <p className="mb-3 text-sm text-neutral-400">Choose which sections appear on the dashboard and in what order.</p>
          <HomeLayoutEditor initial={s.home} />
        </Collapsible>
      </Group>

      <Group id="page-armory" title="Armory" blurb="Firearms, accessories, maintenance">
        <Collapsible id="controls-maintenance" title="Cleaning & Maintenance Defaults" keywords="cleaning interval rounds days due soon new firearm" defaultOpen={saved === "maintenance"}>
          <MaintenanceDefaultsForm s={s} saved={saved === "maintenance"} returnTo={ret} />
        </Collapsible>
        <Collapsible id="controls-firearm-counts" title="Correct Rounds Fired (several firearms)" keywords="reset rounds fired shot count correct zero bulk">
          <p className="mb-3 text-sm text-neutral-400">To correct a single firearm, use Correct count on its page.</p>
          <BulkCounts firearms={firearms} />
        </Collapsible>
        {(["platform", "caliber", "accessory_type", "maintenance_type", "malfunction_type", "zero_distance"] as DropdownCategory[]).map(list)}
      </Group>

      <Group id="page-ammo" title="Ammo" blurb="Purchases, goals, on hand">
        <Collapsible id="controls-ammo" title="Ammo Defaults & Thresholds" keywords="low ammo threshold deduct manufacturer type default purchase" defaultOpen={saved === "ammo"}>
          <AmmoDefaultsForm
            s={s}
            saved={saved === "ammo"}
            returnTo={ret}
            manufacturers={getDropdownOptions(db, "ammo_manufacturer")}
            ammoTypes={getDropdownOptions(db, "ammo_type")}
          />
        </Collapsible>
        <Collapsible id="controls-ammo-counts" title="Correct Ammo On Hand (several calibers)" keywords="reset ammo on hand count correct zero bulk">
          <p className="mb-3 text-sm text-neutral-400">To correct a single caliber, use Correct count on the Ammo page.</p>
          <BulkCounts calibers={calibers} />
        </Collapsible>
        {(["ammo_type", "ammo_manufacturer"] as DropdownCategory[]).map(list)}
      </Group>

      <Group id="page-courses" title="Courses of Fire" blurb="Builder and categories">
        {(["course_category", "position"] as DropdownCategory[]).map(list)}
      </Group>

      <Group id="page-range" title="Range Sessions" blurb="Log a Range Session, Range Day">
        <Collapsible id="controls-range-defaults" title="Range Session Defaults" keywords="shooter grader range location defaults grader date" defaultOpen={saved === "range"}>
          <RangeDefaultsForm s={s} saved={saved === "range"} returnTo={ret} />
        </Collapsible>
        {(["range_location", "weather"] as DropdownCategory[]).map(list)}
      </Group>

      <Group id="page-documents" title="Documents" blurb="Permits and licenses">
        <Collapsible id="controls-documents" title="Expiration Warnings" keywords="expiring permit documents warning days urgent" defaultOpen={saved === "documents"}>
          <DocumentWarningsForm s={s} saved={saved === "documents"} returnTo={ret} />
        </Collapsible>
      </Group>
    </div>
  );
}
