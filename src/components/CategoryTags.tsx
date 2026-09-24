export default function CategoryTags({ categories, empty = "Uncategorized" }: { categories: string[]; empty?: string | null }) {
  if (!categories.length) {
    return empty ? <span className="border border-dashed border-neutral-700 px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-neutral-500">{empty}</span> : null;
  }
  return (
    <span className="flex flex-wrap gap-1">
      {categories.map((c) => (
        <span key={c} className="border border-brand-olive px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-brand-amber">
          {c}
        </span>
      ))}
    </span>
  );
}
