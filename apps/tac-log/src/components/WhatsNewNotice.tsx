import Link from "next/link";
import { dismissWhatsNew } from "@/app/settings/actions";

export default function WhatsNewNotice({ version }: { version: string }) {
  return (
    <div className="border-b border-brand-olive bg-brand-tile print:hidden">
      <form
        action={dismissWhatsNew}
        className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm sm:px-6"
      >
        <span>
          TAC-LOG was updated to <span className="text-brand-amber">{version}</span>.{" "}
          <Link href="/settings/whats-new" className="text-brand-amber underline hover:text-brand-amber-light">
            See what&apos;s new
          </Link>
        </span>
        <button type="submit" className="btn btn-secondary btn-xs">
          Dismiss
        </button>
      </form>
    </div>
  );
}
