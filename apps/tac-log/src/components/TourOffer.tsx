import Link from "next/link";
import { finishTour } from "@/app/tour-actions";

export default function TourOffer() {
  return (
    <form action={finishTour} className="flex flex-wrap items-center justify-between gap-3 border border-neutral-700 bg-neutral-900 px-4 py-3 text-sm">
      <span>New in 0.6.0: a one-minute tour of TAC-LOG, handy if you&apos;re sharing it with someone.</span>
      <span className="flex gap-2">
        <Link href="/?tour=1" className="bg-brand-olive px-3 py-1.5 text-xs hover:bg-brand-olive-light">
          Take the Tour
        </Link>
        <button type="submit" className="border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300 hover:text-neutral-100">
          No Thanks
        </button>
      </span>
    </form>
  );
}
