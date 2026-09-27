import CoreDropdownListEditor from "@core/components/DropdownListEditor";
import { getDb } from "@/lib/db";
import {
  DEFAULT_OPTIONS,
  OPTION_CATEGORIES,
  OPTION_USED_IN,
  getDropdownOptionRows,
  type OptionCategory,
} from "@/lib/db/dropdown-options";
import {
  addDropdownOption,
  deleteDropdownOption,
  moveDropdownOption,
  renameDropdownOption,
  restoreDropdownDefaults,
  sortDropdownAlpha,
} from "@/app/controls/actions";

export default function DropdownListEditor({ category, open }: { category: OptionCategory; open?: boolean }) {
  const rows = getDropdownOptionRows(getDb(), category);
  return (
    <CoreDropdownListEditor
      category={category}
      label={OPTION_CATEGORIES[category]}
      usedIn={OPTION_USED_IN[category]}
      rows={rows}
      missingDefaults={DEFAULT_OPTIONS[category].filter((d) => !rows.some((r) => r.value === d)).length}
      actions={{
        addDropdownOption,
        deleteDropdownOption,
        renameDropdownOption,
        moveDropdownOption,
        sortDropdownAlpha,
        restoreDropdownDefaults,
      }}
      open={open}
    />
  );
}
