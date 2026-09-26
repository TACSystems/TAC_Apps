# TAC-QUAL Changelog

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
