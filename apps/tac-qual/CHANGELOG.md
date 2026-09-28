# TAC-QUAL Changelog

## 0.5.1
Certifications and certificates.

**Certifications.** A certification is what a student earns: a named, ordered
set of courses of fire. Build one, and a class taught from it brings its courses
with it. Attaching a certification only ever adds courses, so a course already
carrying scored runs, or one you added by hand, survives a change of
certification.

**Completion is worked out, never recorded.** A student holds a certification
the moment they hold a passing run on every course in it, from any class on any
date. There is no enrolment and no completion tick, so a student who finishes
the last course a year later, in a different class, simply holds it.

**Certificates.** The class page lists everyone enrolled as needing a course,
complete but not issued, or issued. One button issues numbers for everyone
ready and opens the print sheet. A number is written at issue, so a reprint
carries the same one and pressing Issue again does nothing. The layout is
fixed and the wording is yours, in Settings → Certificates, with per-
certification overrides. Expiry is off by default: a date on paper cannot
account for a requalification that happened after printing. Courses and scores
print as an optional second page.

**Currency, rebuilt.** One row per credential a student holds, rather than one
per course — the certification wherever one exists, and a course that expires
and belongs to no certification on its own. A student partway through is not
listed: nothing to renew yet, and the certification page shows what is missing.
The page opens on Needs attention, the counts are the filters, and the filter
carries into the printable list and the CSV. Contact details are in the row.

**Student record.** A Certifications section: held, with number and expiry, or
which courses are still needed.

**Smaller things.** The header search drew two amber highlights 4px apart —
fixed. Controls is grouped by the page each list belongs to. Help gained a
guide for certifications and certificates.

## 0.4.0
Admin and controls. The app now bends to how you run classes instead of the
other way round.

**Controls.** Every dropdown you pick from — class types, locations, course
categories, shooting positions, calibers, instructor certifications — is now a
list you own. Add, rename, reorder, sort or remove an option, and a rename
follows the records that chose it: a class keeps its group and a course keeps
its filter chip.

**Classes as cards.** The Classes page is now cards grouped by class type, the
way Courses of Fire already looked, with a class's details, days and roster on
its own page. A class with no type shows as Uncategorized until you set one.

**Multi-day classes.** A class holds one row per day, each with its own date and
start and end time, so a three-day course is one class rather than three. The
class date follows the first day and the page shows the span.

**Sign-in sheet.** A printed sheet with a column per day and three signature
columns for each. Past three days it prints a second sheet rather than cramming
the columns.

**Per-course expiry.** A course of fire can say how many months a pass stays
good for. Currency is worked out from it — current, due soon, expired or never
passed — and a course left blank never lapses, which is most civilian
qualifications.

**Dashboard.** A calendar card showing a rolling window of class days with the
course type, dates and times, and a qualification currency card. Every card on
the dashboard can be shown, hidden or reordered under Controls, along with how
many weeks the calendar covers, how many recent classes are listed, and the
due-soon window.

**Help and What's New.** Short guides for every part of the app, offline, under
Help in the gear menu. Release notes live under Settings, and the app says so
once after an update.

**Removed.** Duplicate Class. Copying a class's courses and instructors turned
out to be the wrong shape for the job; class templates are the better answer and
belong in a Class Builder.

## 0.3.0
A new look, shared with TAC-LOG 0.10.0. No feature changes — programs,
certificates and the admin suite are next.

**New type.** Chakra Petch carries the interface; IBM Plex Mono carries the
figures. Scores, counts, percentages and every right-aligned column now sit on
tabular digits, so a column of numbers lines up instead of wandering under an
eye scanning for outliers. Both faces ship inside the app, so nothing is
fetched and nothing changes offline.

**Printed pages are unchanged.** Scorecards, rosters and results sheets stay in
Courier New. The paper you hand a student looks exactly as it did.

**Recut icons.** The app mark is now drawn from the typeface rather than by
hand, with the two letters on a fixed grid so the T sits identically across the
family. TAC Systems gains a company mark of its own — the brackets with a
centred dot.

## 0.2.0
Builders, and the pages an instructor works from between classes.

**Course of Fire builder.** Build and edit a course in the app — phases,
strings, columns and scorecard fields — instead of importing a file. The
scorecard editor shows a live preview of the printed card beside the fields, so
adding, renaming, reordering or removing a line shows what will come out of the
printer as you type.

**Target type builder.** Any number of scoring zones instead of a fixed eight,
with reordering, removal, and Duplicate to copy a target under a new name.

**Range tab.** Courses of Fire, Target Types, Par Timer and a new Instructor Bag
Checklist gathered under one menu. The checklist ships with defaults written for
running a class — spare eye and ear protection for students, course packets and
blank scorecards, target stands and pasters, certifications and waivers — and
you can keep several lists.

**Settings.** Security (PIN, database encryption, recovery key, auto-lock),
Backup with a backup password and automatic backups to a folder you pick,
Restore, class defaults, display and date format, update checking, and About.

**Records tab.** Qualification Records now shows the class each record's latest
run was scored in, and sorting on it groups a class together. Currency shows who
is still qualified and who is expired or due soon, over a window you set.
Class Archive lists every class with its enrolment and pass rate. Qualifications,
scored runs and students export to CSV.

**Program-wide search** in the header, across students, classes, courses and
target types. Ctrl+K, or Cmd+K on a Mac.

**Scoring by keyboard.** Enter walks the zone cells and on to the next shooter,
Shift+Enter walks back, and the arrow keys move between shooters rather than
nudging the number. The scroll wheel can no longer change a score.

**Duplicate Class** copies a class's courses of fire and credited instructors
into a new class. The roster and scores stay with the class that was run.

**Fixed.** A course built in the app could never be passed — it scored out of
zero when the phases added up on their own instead of a total being typed in.
The five seeded courses now ship with an 80% pass mark; without one, PASS and
FAIL could not be decided. Automatic backups could never have run, because the
route the app calls on a timer did not exist.

## 0.1.0
First release. Student roster, classes and events, multi-shooter qualification
scoring, qualification records, the printing pack, instructor profile with
certifications, and a relay par timer. Built on the TAC Systems shared core.
