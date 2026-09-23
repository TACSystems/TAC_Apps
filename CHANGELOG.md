# TAC-LOG Changelog

All notable changes to TAC-LOG, newest first.

## [0.5.0] — Planned

### Added
- Firearm nicknames, with a setting to show the nickname, the make/model, or both.
- New brand identity: amber stencil TL icon on olive (rounded tile on macOS), Courier New throughout, "TAC-LOG" header, "Powered by Precision Systems" in the footer and About.

### Changed
- The app uses the full window width. The Course Builder string table fits without sideways scrolling.

### Security
- Local server lockdown: a per-launch secret and Host checks, so only the TAC-LOG window can talk to its built-in server.
- Password-protected (encrypted) backups.
- Optional encryption of the database itself, with a printed recovery key.
- Auto-lock when the computer sleeps or the screen locks.
- Electron hardening: the server runs in a sandboxed utility process, and debugging and run-as-Node switches are turned off in shipped builds.

## [0.4.1] — 2026-09-23

### Added
- First macOS build (Apple Silicon).

### Fixed
- **Critical:** installed copies of the app could fail with an error on every page. The database library was linked through a path that only existed on the build machine. Every earlier installer was likely affected.

### Changed
- Smaller app. Stray build files, source code, an unused empty database, and unused image libraries are no longer bundled (the server part dropped from 90 MB to 41 MB).

## [0.4.0] — 2026-09-22

### Added
- Photos for firearms and accessories, separate from receipts.
- Receipt and document uploads for accessories. Several files can be uploaded at once.
- Accessory detail page with full editing.
- Accessory mount history: moving an optic or light between firearms is recorded automatically.
- Sale / transfer records for firearms (buyer, FFL, price, notes) with bill-of-sale uploads. Optionally marks the firearm as sold.
- Edit and delete for range sessions (the firearm's round count and ammo on hand update to match), maintenance, malfunction, and zero entries, and ammo purchases.
- Remove an ammo goal.
- Cost per round on ammo purchases.
- Printable Inventory Report for insurance: every firearm with serial number, values, purchase and FFL info, photos, mounted accessories, totals, and a signature line.
- Optional PIN lock with auto-lock when idle, a Lock button, and a RESET-PIN recovery file.
- Deeper stats:
  - rounds per month
  - pass rate by course
  - hit-zone distribution
  - per-firearm averages and malfunctions per 1,000 rounds
  - ammo cost per round and estimated spend (also shown on each range session)
- Spreadsheet import (.xlsx or .csv) with preview and duplicate detection, built to read the original FIREARMS INVENTORY sheet layout.
- CSV export of firearms, accessories, ammo, range sessions, rounds fired, and maintenance.

### Fixed
- The Delete Firearm warning now correctly says accessories are kept and unlinked, not deleted.

## [0.3.0] — 2026-09-22

### Added
- Home page Ammo On Hand cards for every caliber with a goal, flagged LOW below a set threshold.
- Home page quick actions: Log a Range Session, Build a Course of Fire, Update Rounds Fired, Log Ammo Purchase.
- Log a Range Session course picker.
- Update Rounds Fired on each firearm, for practice rounds outside a logged session. Optionally deducts from ammo on hand.
- Settings tab:
  - full backup and restore
  - course import and export
  - range-session defaults
  - new-firearm cleaning defaults
  - due-soon and low-ammo thresholds
  - currency symbol
  - About
- Controls:
  - show, hide, and reorder home page sections
  - rename, reorder, sort, and restore defaults for every dropdown list
  - seven new lists: ammo manufacturer, maintenance type, malfunction type, zero distance, range location, weather, shooting position

### Changed
- "Log a Run" renamed "Log a Range Session" everywhere.
- Backup, restore, and course import moved from Controls and Courses into Settings.

### Fixed
- Backups could miss recent entries, and never included receipt images. Full Backup is now one complete .zip.

## [0.2.0] — 2026-09-22

### Added
- Course of Fire Builder, with everything customizable:
  - course details and passing score
  - string columns (rename, reorder, add your own)
  - phases and strings, including Option A/B variants and instruction rows
  - scorecard fields
- Every course can be edited, duplicated, exported, and deleted, including the built-in courses.
- Target Types: reusable targets, each with its own scoring matrix, shared across courses.
- Three print views for every course: Course + Scorecard, Course Only, Scorecard Only.
- PASS/FAIL on range sessions and printed scorecards.
- Home page Maintenance Schedule with one-click Log Cleaning, and an optional clean-every-N-days interval.

### Removed
- The Group side (participants, group range log, group stats) and its data.

### Fixed
- Receipt photos over 1 MB failed to upload and crashed the page. The limit is now 24 MB, with clear messages for oversized or unsupported files (such as iPhone HEIC).
- Firearms never logged as cleaned now count all their rounds toward cleaning due.
- Only Cleaning entries reset the cleaning counter; inspections and repairs no longer do.

## [0.1.0] — 2026-09-22

First desktop release (Windows installer).

### Added
- Firearm inventory with receipts, accessories, maintenance and cleaning log, malfunction log, zero log, total investment, and cleaning-due tracking.
- Ammo purchases with lot numbers, ammo goals, and on-hand counts.
- Courses of Fire (five built-in), range session scoring, printable scorecards, range log, stats, and personal bests.
- Global search and a one-click database export.
- Desktop app for Windows (and the Mac build setup), with data stored in the user's own app-data folder.
