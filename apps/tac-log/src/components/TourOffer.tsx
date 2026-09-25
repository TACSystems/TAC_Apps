import Link from "next/link";
import { finishTour } from "@/app/tour-actions";

export default function TourOffer() {
  return (
    <form action={finishTour} className="flex flex-wrap items-center justify-between gap-3 border border-neutral-700 bg-neutral-900 px-4 py-3 text-sm">
      <span>New in 0.6.0: a one-minute tour of TAC-LOG, handy if you&apos;re sharing it with someone.</span>
      <span className="flex gap-2">
        <Link href="/?tour=1" className="btn btn-primary btn-sm">
          Take the Tour
        </Link>
        <button type="submit" className="btn btn-secondary btn-sm">
          No Thanks
        </button>
      </span>
    </form>
  );
}
