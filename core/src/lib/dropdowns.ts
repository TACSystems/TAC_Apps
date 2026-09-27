export type DropdownRow = { id: string; value: string };

/**
 * Generic over the app's own category union, so TAC-LOG's narrow
 * `DropdownCategory` still type-checks against these signatures.
 */
export type DropdownActions<C extends string = string> = {
  addDropdownOption: (category: C, formData: FormData) => Promise<void>;
  deleteDropdownOption: (category: C, id: string) => Promise<void>;
  renameDropdownOption: (category: C, id: string, formData: FormData) => Promise<void>;
  moveDropdownOption: (category: C, id: string, dir: -1 | 1) => Promise<void>;
  sortDropdownAlpha: (category: C) => Promise<void>;
  restoreDropdownDefaults: (category: C) => Promise<void>;
};
