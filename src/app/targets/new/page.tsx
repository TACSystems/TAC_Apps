import Link from "next/link";
import TargetTypeEditor from "@/components/TargetTypeEditor";

export default function NewTargetTypePage() {
  return (
    <div className="max-w-2xl">
      <Link href="/targets" className="text-xs text-blue-400 hover:text-blue-300">
        ← Target Types
      </Link>
      <h1 className="mb-4 text-xl font-semibold">New Target Type</h1>
      <TargetTypeEditor />
    </div>
  );
}
