import Link from "next/link";
import ImportCofForm from "@/components/ImportCofForm";

export default function CourseUpdatesPage() {
  return (
    <div className="max-w-xl">
      <Link href="/courses" className="text-xs text-blue-400 hover:text-blue-300">
        ← Courses of Fire
      </Link>
      <h1 className="mb-2 text-xl font-semibold">Import Courses of Fire</h1>
      <p className="mb-2 text-sm text-neutral-400">
        Load a TAC-LOG course file (.json) to add new courses or update existing ones. A course whose code
        already exists is replaced with the imported version; everything else is added. Target types in the
        file are matched to yours by name and scoring matrix, or created if they&apos;re new.
      </p>
      <p className="mb-4 text-sm text-neutral-400">
        Use the Export button on any course (or Export All) to make a file you can share with another TAC-LOG
        user. Imports only touch Course of Fire and Target Type data. Your firearms, ammo, and range log are
        never affected.
      </p>
      <ImportCofForm />
    </div>
  );
}
