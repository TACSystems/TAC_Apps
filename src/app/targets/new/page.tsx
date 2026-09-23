import Link from "next/link";
import TargetTypeEditor from "@/components/TargetTypeEditor";

export default function NewTargetTypePage() {
  return (
    <div className="max-w-4xl">
      <Link href="/targets" className="text-xs text-brand-amber hover:text-brand-amber-light">
        ← Target Types
      </Link>
      <h1 className="mb-4 text-xl font-semibold">New Target Type</h1>
      <TargetTypeEditor />
    </div>
  );
}
