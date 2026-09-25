import Link from "next/link";
import type { ReactNode } from "react";
import { dataDir } from "@/lib/db";
import Collapsible from "@core/components/Collapsible";
import SectionTools from "@core/components/SectionTools";

export const dynamic = "force-dynamic";

const A = ({ href, children }: { href: string; children: ReactNode }) => (
  <Link href={href} className="text-brand-amber underline hover:text-brand-amber-light">
    {children}
  </Link>
);

function Guide({ id, title, keywords, children }: { id: string; title: string; keywords: string; children: ReactNode }) {
  return (
    <Collapsible id={`help-${id}`} title={title} keywords={keywords}>
      <div className="flex max-w-3xl flex-col gap-2 text-sm leading-relaxed text-neutral-300 [&_li]:ml-5 [&_li]:list-disc [&_ol>li]:list-decimal">
        {children}
      </div>
    </Collapsible>
  );
}

export default function HelpPage() {
  return (
    <div data-scope="help" className="flex max-w-5xl flex-col gap-3">
      <div>
        <h1 className="text-xl font-semibold">Help</h1>
        <p className="text-sm text-neutral-400">
          Short guides for everything in TAC-LOG. Works offline. Prefer a walkthrough? <A href="/?tour=1">Take the tour</A>.
        </p>
      </div>
      <SectionTools scope="help" search />

      <Guide id="start" title="Getting Started" keywords="first start begin new setup">
        <ol>
          <li>Add your firearms in the <A href="/inventory">Armory</A>, or import your spreadsheet under <A href="/settings#settings-import-export">Settings › Import / Export</A>.</li>
          <li>Log ammo purchases and set goals on the <A href="/ammo">Ammo</A> page (buttons at the top right).</li>
          <li>After a range trip, press <A href="/range-log/new">Log a Range Session</A> and choose Course of fire or Practice only. Everything from the same date and location becomes one numbered session.</li>
          <li>Long pages fold into sections: click a heading to open or close it, or use Expand All / Collapse All. TAC-LOG remembers what you left open.</li>
          <li>Set up a backup under <A href="/settings#settings-backup">Settings › Backup</A>. Everything stays on this computer, so backups are your only copy.</li>
        </ol>
      </Guide>

      <Guide id="firearms" title="Firearms, Accessories & Photos" keywords="armory firearm add nickname accessory photo receipt serial duplicate insurance report sale transfer">
        <p>Each firearm has a profile page: details, photos, receipts, accessories, cleaning, malfunction and zero logs, part counters, and sale/transfer records. Click any row in the Armory to open it.</p>
        <ul>
          <li><b>Nickname:</b> set one on the firearm, and choose how names show under Settings › Display.</li>
          <li><b>Add Another Like This</b> copies a firearm except for the serial number and purchase details.</li>
          <li><b>Photos and receipts:</b> drag files onto the upload box, or copy an image and press Cmd/Ctrl+V while hovering it. Click a photo to view it full size.</li>
          <li><b>Inventory Report</b> (Armory › Inventory Report) is a printable list for insurance, with serials, values, and photos.</li>
        </ul>
      </Guide>

      <Guide id="range" title="Logging Range Time" keywords="range session log course score run practice range day rounds fired merge move number par timer checklist">
        <ul>
          <li><b>Sessions:</b> a session is one trip: a date and a location, numbered #0001, #0002, and so on. Every course run and practice entry with the same date and location joins it automatically, and the Range Log shows one line per session.</li>
          <li><b>Course of fire:</b> Log a Range Session › Course of fire › pick the course › enter hits per zone. The score, PASS/FAIL, round count, and ammo all update.</li>
          <li><b>Practice only:</b> one screen for every firearm you shot, with rounds and the ammo used. You can also type a quick score for a course.</li>
          <li><b>Adding to a session:</b> open it and use + Course Run or + Practice; the date and location are filled in for you. Update Rounds Fired on a firearm also joins the session for its date and location.</li>
          <li><b>Fixing sessions:</b> on a session page, Move sends an entry to another session (or splits it into a new one). Edit Session changes the date or location for everything in it, merges it into another session, or deletes it.</li>
          <li><b>Par Timer:</b> run a course string by string with start and par beeps, or use the free timer for dry fire. Press Space to start or stop.</li>
          <li><b>Range Bag Checklist:</b> tick items off as you pack, print it, and press Uncheck All for the next trip.</li>
        </ul>
      </Guide>

      <Guide id="courses" title="Courses of Fire" keywords="course build builder category handgun rifle shotgun import export target type json">
        <ul>
          <li><b>Build:</b> Courses of Fire › Build New Course. Set the details, categories, target type, columns, phases and strings, and scorecard fields.</li>
          <li><b>Categories</b> (Handgun, Rifle, Shotgun, or your own from Controls) filter the course list, sort the firearm list when logging, and group Stats.</li>
          <li><b>Share:</b> Export a course (or all of them) as a .json file. Import one or more under Settings › Import / Export, where you review and categorize each before saving.</li>
          <li><b>Target Types</b> hold the scoring zones, such as X/10/9 or A/C/D, and are shared between courses.</li>
        </ul>
      </Guide>

      <Guide id="counts" title="Ammo, Round Counts & Corrections" keywords="ammo on hand goal low correct count reset rounds fired lifetime adjust part counter barrel type grain brand pick">
        <ul>
          <li>Ammo on hand = purchases − rounds logged as fired (course runs, and practice with Deduct checked) ± corrections.</li>
          <li><b>Which ammo:</b> when you log rounds, pick the ammo used (caliber, type, grain, brand). It defaults to the last ammo used in that firearm, and those rounds come off that exact line. Rounds logged without a pick show as &quot;Not specified&quot; under their caliber.</li>
          <li><b>Goals</b> are per caliber, and can be narrowed to a type and grain (e.g. 9mm · JHP · 124gr). They show across the top of the Ammo page and on the dashboard.</li>
          <li><b>Totals:</b> the boxes at the top of the Ammo page open full lists by caliber, by caliber · brand · grain, and by caliber · type · grain.</li>
          <li><b>Correct count</b> (open a type/grain line on the Ammo page and use it on a brand, or on a firearm&apos;s Shots Fired) sets the real number. It&apos;s saved as a dated correction you can remove, so history and stats stay intact.</li>
          <li><b>Controls › Armory / Ammo</b> have bulk corrections for many at once. Type RESET to confirm. A safety copy of the database is saved first.</li>
          <li><b>Part Counters</b> (on a firearm) track rounds on a barrel, spring, and so on. Replaced starts the counter over and logs the swap.</li>
        </ul>
      </Guide>

      <Guide id="maintenance" title="Cleaning & Maintenance" keywords="cleaning due soon interval maintenance schedule log">
        <p>Set Clean Every (rounds and/or days) on a firearm. The dashboard&apos;s Maintenance Schedule shows what&apos;s due and due soon (the threshold is in Controls › Armory). Only entries of type Cleaning reset the counter. Log Cleaning on the dashboard does it in one click.</p>
      </Guide>

      <Guide id="documents" title="Permits & Documents" keywords="permit carry license nfa tax stamp form 4 membership hunting expire expiration reminder scan">
        <p>Track carry permits, NFA tax stamps and Form 4 status, memberships, and licenses under <A href="/documents">Documents</A>. Attach scans of each. TAC-LOG warns you on the dashboard and in the Heads Up bar before anything expires. Set how early under Controls › Documents.</p>
      </Guide>

      <Guide id="backups" title="Backups & Restore" keywords="backup restore automatic folder password tlbak zip usb onedrive icloud">
        <ul>
          <li><b>Download Full Backup</b> saves everything, including photos and documents, in one file. Set a backup password to encrypt it (.tlbak). You&apos;ll need that password to restore.</li>
          <li><b>Automatic Backups</b> write to a folder you pick, daily or weekly, and keep the latest copies. A synced folder (OneDrive, iCloud Drive, Dropbox) or a USB drive gives you an off-computer copy.</li>
          <li><b>Restore</b> replaces the current data with a backup. The current data is set aside first, in a pre-restore folder.</li>
          <li><b>File › Back Up Now</b> runs a backup right away.</li>
        </ul>
      </Guide>

      <Guide id="security" title="Security: PIN, Password & Encryption" keywords="pin password encryption recovery key lock locked out forgot wait cooldown sleep">
        <ul>
          <li><b>PIN:</b> keeps casual users out. The data file itself isn&apos;t encrypted.</li>
          <li><b>Database encryption:</b> a password (8+ characters) encrypts the database, photos, and documents on disk. Print the recovery key when you turn it on: it&apos;s the only way back in if you forget the password.</li>
          <li>After 5 wrong tries you wait 30 seconds, then longer (up to an hour). Nothing is ever erased.</li>
          <li>TAC-LOG locks when the computer sleeps or the screen locks, and after the idle time you set. Lock any time with Cmd/Ctrl+L.</li>
          <li><b>Forgot your PIN?</b> Close TAC-LOG, create an empty file named RESET-PIN in the data folder (below), and reopen. <b>Forgot your password?</b> Use the recovery key on the unlock screen.</li>
        </ul>
      </Guide>

      <Guide id="move" title="Moving to a New Computer" keywords="move new computer transfer migrate copy">
        <ol>
          <li>On the old computer: Settings › Backup › Download Full Backup (note the backup password if you set one).</li>
          <li>Install TAC-LOG on the new computer and open it.</li>
          <li>Settings › Restore › choose the backup file. Everything comes across, including photos and documents.</li>
          <li>If you use database encryption, turn it on again on the new computer and print the new recovery key.</li>
        </ol>
      </Guide>

      <Guide id="settings-controls" title="Settings vs Controls" keywords="settings controls where customize dropdown defaults lists">
        <p><b>Controls</b> customizes the pages of TAC-LOG, organized by page: dropdown lists, defaults, thresholds, the dashboard layout, and bulk count corrections.</p>
        <p><b>Settings</b> manages the app itself: security, backups, restore, import/export, display (theme, text size, date format, name display), the Heads Up bar, and About.</p>
      </Guide>

      <Guide id="shortcuts" title="Keyboard Shortcuts" keywords="keyboard shortcut hotkey cmd ctrl k l search">
        <ul>
          <li><b>Cmd/Ctrl+K:</b> quick search for firearms, serials, courses, documents, sessions, and settings.</li>
          <li><b>Cmd/Ctrl+L:</b> lock TAC-LOG (when a PIN or password is set).</li>
          <li><b>Cmd/Ctrl+Shift+B:</b> back up now (needs an automatic-backup folder).</li>
          <li><b>Par Timer:</b> Space starts or stops, ← → change string.</li>
          <li><b>Photo viewer:</b> ← → next or previous, Esc closes.</li>
        </ul>
      </Guide>

      <Guide id="faq" title="FAQ" keywords="faq data where stored internet online privacy mac open anyway">
        <ul>
          <li><b>Where is my data?</b> Only on this computer, in <span className="break-all text-neutral-100">{dataDir()}</span>. Nothing is sent anywhere.</li>
          <li><b>Does TAC-LOG need the internet?</b> No. It works fully offline.</li>
          <li><b>Mac says the app can&apos;t be opened?</b> System Settings › Privacy &amp; Security › Open Anyway (first launch only).</li>
          <li><b>Something looks off?</b> Settings › About shows the version and data folder. Note what you did, what you expected, and what happened.</li>
        </ul>
      </Guide>
    </div>
  );
}
