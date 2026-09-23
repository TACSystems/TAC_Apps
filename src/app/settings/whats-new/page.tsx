import Link from "next/link";
import ChangelogView from "@/components/ChangelogView";
import { parseChangelog } from "@/lib/changelog";

export const dynamic = "force-dynamic";

export default function WhatsNewPage() {
  return (
    <div className="flex max-w-4xl flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl">What&apos;s New</h1>
          <p className="text-sm text-neutral-400">Every TAC-LOG release, newest first.</p>
        </div>
        <Link href="/settings" className="text-sm text-brand-amber hover:text-brand-amber-light">
          Back to Settings
        </Link>
      </div>
      <ChangelogView versions={parseChangelog()} />
    </div>
  );
}
