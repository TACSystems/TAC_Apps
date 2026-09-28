import Link from "next/link";
import type { ReactNode } from "react";
import PageHeader from "@core/components/PageHeader";
import Collapsible from "@core/components/Collapsible";
import SectionTools from "@core/components/SectionTools";

export const dynamic = "force-dynamic";

const A = ({ href, children }: { href: string; children: ReactNode }) => (
  <Link href={href} className="text-brand-amber underline hover:text-brand-amber-light">
    {children}
  </Link>
);

function Guide({
  id,
  title,
  keywords,
  children,
}: {
  id: string;
  title: string;
  keywords: string;
  children: ReactNode;
}) {
  return (
    <Collapsible id={`help-${id}`} title={title} keywords={keywords}>
      <div className="flex max-w-3xl flex-col gap-2 text-sm normal-case leading-relaxed text-neutral-300 [&_li]:ml-5 [&_li]:list-disc [&_ol>li]:list-decimal">
        {children}
      </div>
    </Collapsible>
  );
}

export default function HelpPage() {
  return (
    <div data-scope="help" className="flex max-w-5xl flex-col gap-3">
      <PageHeader
        title="Help"
        icon="help"
        subtitle="Short guides for everything in TAC-QUAL. Works offline — nothing here needs a connection."
      />
      <SectionTools scope="help" search />

      <Guide
        id="certifications"
        title="Certifications and Certificates"
        keywords="certification certificate credential program issue number print expiry currency"
      >
        <p>
          A <b>certification</b> is what a student walks away with: a named, ordered set of courses of fire. Build one
          under <A href="/certifications">Certifications</A>.
        </p>
        <p>
          <b>Nothing is enrolled or marked complete.</b> A student holds a certification the moment they have a passing
          run on every course in it — from any class, on any date. Someone who finishes the last course a year later in
          a different class still holds it, with no special handling.
        </p>
        <p>
          Picking a certification on a class brings its courses onto that class. It only ever <b>adds</b>: a course
          already on the class may carry scored runs, and a course you added by hand stays put even if you change the
          certification.
        </p>
        <p>
          <b>Certificates are issued from the class page.</b> The Certificates section lists everyone enrolled as
          needing a course, complete but not issued, or issued. One button issues numbers for everyone ready and opens
          the print sheet.
        </p>
        <p>
          <b>A certificate number is written when it is issued</b>, not when it is printed. Reprint as often as you
          like — the number never changes, and pressing Issue again does nothing to a student who already has one.
        </p>
        <p>
          Wording lives in <A href="/settings">Settings → Certificates</A>, and any certification can override the
          title and body for itself. The signature is a printed line, signed by hand. An expiry date is off by default:
          a date on paper cannot account for a requalification that happened after it was printed.
        </p>
        <p>
          <A href="/records/currency">Currency</A> shows one row per credential held — the certification where one
          exists, or a course that expires and belongs to no certification. A student partway through is not there;
          they have nothing to renew yet, and the certification page shows what they are missing.
        </p>
      </Guide>

      <Guide id="start" title="Getting Started" keywords="first start begin new setup instructor">
        <ol>
          <li>
            Fill in your certifications and signature block under{" "}
            <A href="/instructor">Instructor Profile</A>. They print on results sheets and certificates.
          </li>
          <li>
            Add students on the <A href="/students">Students</A> page, or bring a roster in under{" "}
            <A href="/settings">Settings › Import / Export</A>.
          </li>
          <li>
            Check the courses you will score against under <A href="/courses">Courses of Fire</A>. Five ship with the
            app; build your own with + Course.
          </li>
          <li>
            Create the class under <A href="/classes">Classes</A>, set its days and times, then enrol students from
            its details page.
          </li>
          <li>
            Set up a backup under <A href="/settings">Settings › Backup</A>. Everything stays on this computer, so a
            backup is your only second copy.
          </li>
        </ol>
      </Guide>

      <Guide
        id="classes"
        title="Classes, Days & Enrolment"
        keywords="class card type category day date start end time multi-day roster enrol enroll student add archive"
      >
        <ul>
          <li>
            <b>Cards by type:</b> the Classes page groups classes by Class Type. The list of types is yours to edit
            under <A href="/controls?open=class_type">Controls › Class Types</A>; a class with no type shows as
            Uncategorized until you set one.
          </li>
          <li>
            <b>Days and times:</b> a class holds one row per day, each with its own date and start and end time. Add a
            day for a multi-day course; the class date follows the first day, and the Classes page shows the span.
          </li>
          <li>
            <b>Enrolment:</b> open a class and add students from its details page. A student can sit in any number of
            classes; their record keeps every run.
          </li>
          <li>
            <b>Finishing up:</b> mark a class complete when it is done. The dashboard keeps current work in view and{" "}
            <A href="/records/classes">Class Archive</A> keeps the history.
          </li>
        </ul>
      </Guide>

      <Guide
        id="courses"
        title="Courses of Fire & Targets"
        keywords="course of fire builder phase string column scorecard preview pass mark expiry expires months target type zone"
      >
        <ul>
          <li>
            <b>Builder:</b> phases, strings, scoring columns and the printed scorecard, all in one page. The preview
            beside the scorecard fields is the card that comes out of the printer.
          </li>
          <li>
            <b>Pass mark:</b> under Scoring Setup. Without one there is nothing to decide PASS or FAIL against.
          </li>
          <li>
            <b>Expiry:</b> also under Scoring Setup — how many months a pass stays good for. Leave it blank on a
            course that never lapses; only courses with an expiry appear under{" "}
            <A href="/records/currency">Currency</A>.
          </li>
          <li>
            <b>Target types:</b> any number of scoring zones, reorderable, with Duplicate to copy one under a new
            name. A course points at a target type, so changing the zones changes every scorecard that uses it.
          </li>
        </ul>
      </Guide>

      <Guide
        id="scoring"
        title="Scoring a Relay"
        keywords="score run relay keyboard enter arrow shooter zone hits attempt pass fail"
      >
        <ul>
          <li>
            <b>Where:</b> open the class, pick the course of fire, and score the whole relay on one grid — a row per
            shooter, a column per scoring zone.
          </li>
          <li>
            <b>Keyboard:</b> Enter walks the cells and on to the next shooter, Shift+Enter walks back, and the arrow
            keys move between shooters. Neither the arrows nor the scroll wheel can change a number.
          </li>
          <li>
            <b>Re-shoots:</b> score the course again and it is kept as a further attempt. Records show the latest run
            and count every one.
          </li>
        </ul>
      </Guide>

      <Guide
        id="printing"
        title="Printing"
        keywords="print scorecard roster sign-in sheet results signature certificate courier"
      >
        <ul>
          <li>
            <b>Blank scorecards</b> for the relay, <b>a sign-in sheet</b> with a column per day and three signature
            columns, and <b>a results sheet</b> with scores and PASS/FAIL — all from the class page.
          </li>
          <li>A course longer than three days prints a second sign-in sheet rather than cramming the columns.</li>
          <li>Printed pages are set in Courier New on purpose: it photocopies and faxes cleanly.</li>
        </ul>
      </Guide>

      <Guide
        id="records"
        title="Records & Currency"
        keywords="records qualification currency expired due soon class archive export csv search"
      >
        <ul>
          <li>
            <A href="/records">Qualification Records</A> lists every student against every course, with the class
            their latest run was scored in.
          </li>
          <li>
            <A href="/records/currency">Currency</A> works out who is current, due soon, expired or has never
            passed, from the expiry set on each course. Set the due-soon window on the dashboard card under{" "}
            <A href="/controls?open=home">Controls › Dashboard Layout</A>.
          </li>
          <li>
            <A href="/records/classes">Class Archive</A> lists every class with its enrolment and pass rate.
          </li>
          <li>Qualifications, scored runs and students all export to CSV from Settings.</li>
        </ul>
      </Guide>

      <Guide
        id="dashboard"
        title="The Dashboard"
        keywords="home dashboard calendar upcoming classes layout sections order currency card recent"
      >
        <ul>
          <li>
            The calendar shows a rolling window of weeks with one entry per class day — hover for the type, the hours,
            and which day of the course it is.
          </li>
          <li>
            Show, hide and reorder every card under <A href="/controls?open=home">Controls › Dashboard Layout</A>,
            along with how many weeks the calendar covers and how many recent classes are listed.
          </li>
        </ul>
      </Guide>

      <Guide
        id="search"
        title="Finding Things"
        keywords="search global ctrl k cmd k filter section expand collapse"
      >
        <ul>
          <li>
            The search box in the header covers students, classes, courses and target types. Ctrl+K, or Cmd+K on a
            Mac.
          </li>
          <li>
            Long pages fold into sections: click a heading to open or close it, or use Expand All / Collapse All.
            TAC-QUAL remembers what you left open.
          </li>
          <li>Tables have their own filter box, and every sortable column header can be clicked.</li>
        </ul>
      </Guide>

      <Guide
        id="security"
        title="Security & Backups"
        keywords="pin password encryption recovery key auto-lock backup restore automatic folder tqbak import export"
      >
        <ul>
          <li>
            <b>Lock:</b> a PIN or password, with auto-lock after an idle period. Turning on encryption puts the whole
            database behind AES-256 — keep the recovery key somewhere else, because without it an encrypted database
            cannot be opened.
          </li>
          <li>
            <b>Backups:</b> manual, or automatic to a folder you pick. A backup can carry its own password.
          </li>
          <li>
            <b>Restore</b> replaces everything in the app with the contents of a backup, after taking a copy of what
            was there first.
          </li>
          <li>
            Import and export live in <A href="/settings">Settings</A>, next to Backup.
          </li>
        </ul>
      </Guide>

      <Guide id="whats-new" title="Versions & Updates" keywords="version update whats new changelog release notes">
        <ul>
          <li>
            <A href="/settings/whats-new">What&apos;s New</A> carries the notes for every release, newest first.
          </li>
          <li>
            After an update the app says so once, at the top of the page, until you dismiss it.
          </li>
          <li>The version you are running is in Settings › About and at the foot of every page.</li>
        </ul>
      </Guide>
    </div>
  );
}
