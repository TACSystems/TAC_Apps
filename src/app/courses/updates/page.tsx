import ImportCofForm from "@/components/ImportCofForm";

export default function CourseUpdatesPage() {
  return (
    <div className="max-w-xl">
      <h1 className="mb-2 text-xl font-semibold">Import Course of Fire Updates</h1>
      <p className="mb-4 text-sm text-neutral-400">
        Load a courses-of-fire patch file to add new courses or update existing ones. This only
        touches Course of Fire reference data — your firearms, ammo, and range log are never
        affected by an import.
      </p>
      <ImportCofForm />
    </div>
  );
}
