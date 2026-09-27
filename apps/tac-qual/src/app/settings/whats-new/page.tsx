import Link from "next/link";
import PageHeader from "@core/components/PageHeader";
import ChangelogProse from "@core/components/ChangelogProse";
import { changelog, currentVersion } from "@/lib/changelog";

export const dynamic = "force-dynamic";

export default function WhatsNewPage() {
  return (
    <div className="flex max-w-4xl flex-col gap-4">
      <PageHeader
        title="What's New"
        subtitle="Every TAC-QUAL release, newest first."
        actions={
          <Link href="/settings" className="text-sm text-brand-amber hover:text-brand-amber-light">
            Back to Settings
          </Link>
        }
      />
      <ChangelogProse versions={changelog()} currentVersion={currentVersion()} />
    </div>
  );
}
