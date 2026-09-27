import PageHeader from "@core/components/PageHeader";
import SectionTools from "@core/components/SectionTools";
import Collapsible from "@core/components/Collapsible";
import DropdownListEditor from "@/components/DropdownListEditor";
import HomeLayoutEditor from "@/components/HomeLayoutEditor";
import { getDb } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { type OptionCategory } from "@/lib/db/dropdown-options";

export const dynamic = "force-dynamic";

const ORDER: OptionCategory[] = [
  "class_type",
  "class_location",
  "course_category",
  "position",
  "caliber",
  "instructor_cert",
];

export default async function ControlsPage({ searchParams }: { searchParams: Promise<{ open?: string }> }) {
  const { open } = await searchParams;
  const s = getSettings(getDb());

  return (
    <div data-scope="controls" className="flex max-w-5xl flex-col gap-3">
      <PageHeader
        title="Controls"
        icon="controls"
        subtitle="The dashboard layout and the dropdown lists you pick from around the app. Rename or remove an option and every record using it follows."
      />
      <SectionTools scope="controls" search />

      <Collapsible
        id="controls-home-layout"
        title="Dashboard Layout"
        keywords="home dashboard sections order show hide calendar weeks currency recent classes"
        defaultOpen={open === "home"}
      >
        <p className="mb-3 text-sm normal-case text-neutral-400">
          Choose which cards appear on the dashboard and in what order.
        </p>
        <HomeLayoutEditor initial={s.home} />
      </Collapsible>

      {ORDER.map((c) => (
        <DropdownListEditor key={c} category={c} open={open === c} />
      ))}

      <p className="mt-2 text-xs text-neutral-500">
        Class Types group the Classes page. A class with no type shows as Uncategorized until you set one on its
        details page.
      </p>
    </div>
  );
}
