import PageHeader from "@core/components/PageHeader";
import SectionTools from "@core/components/SectionTools";
import DropdownListEditor from "@/components/DropdownListEditor";
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

  return (
    <div data-scope="controls" className="flex max-w-5xl flex-col gap-3">
      <PageHeader
        title="Controls"
        icon="controls"
        subtitle="The dropdown lists you pick from around the app. Rename or remove an option and every record using it follows."
      />
      <SectionTools scope="controls" search />

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
