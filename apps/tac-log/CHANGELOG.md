# TAC-LOG Changelog

All notable changes to TAC-LOG, newest first.

## [0.8.0] — 2026-09-24

### Added
- **Range sessions:** a session is one trip to the range (date + location), numbered #0001, #0002, and so on. Every course run and practice entry from the same date and location joins it automatically, whether it was logged from a course, the practice screen, or Update Rounds Fired.
  - The Range Log shows one line per session: number, date, location, firearms, rounds, and course scores with PASS/FAIL. Click a session to see everything in it.
  - On a session page: + Course Run and + Practice add to it with the date and location filled in. Move sends an entry to another session or splits it off into a new one. Edit Session changes the date, location, or notes for everything in it, merges it into another session, or deletes it.
  - Existing range log and Update Rounds Fired entries are grouped into sessions automatically. Older Range Day entries keep their location.
- **Which ammo was fired:** course runs, practice, and Update Rounds Fired have an Ammo Used pick (caliber, type, grain, brand) that defaults to the last ammo used in that firearm. Those rounds come off that exact line of ammo.
- **Ammo page redesign:**
  - Goals across the top in a 3-wide grid. A goal is per caliber and can be narrowed to a type and grain (e.g. 9mm · JHP · 124gr).
  - Total boxes: By Caliber, and By Caliber · Brand · Grain. Click one for the full list, which also offers By Caliber · Type · Grain and shows average cost per round.
  - On Hand is grouped Caliber › Type + Grain, with brands combined on each line. Open a line to see each brand and correct its count.
  - Log Purchase and Set Goal are buttons at the top right that open in a window.
- **Pages fold into sections:** firearm, accessory, document, course, range session, Ammo, and Stats pages. Each has Expand All / Collapse All, collapsed headings show a one-line summary (e.g. "Maintenance · 3 entries · last 09/12"), and TAC-LOG remembers which sections you left open.
- Course pages list your runs of that course with scores and the session each belongs to.

### Changed
- One **Log a Range Session** button asks "Course of fire, or practice only?". The separate Range Day button is gone; its screen is now Log Practice.
- A single scored course is now called a course run; the dashboard's Recent Range Sessions lists sessions.
- Trip notes from the practice screen are saved on the session instead of on every entry.
- Ammo corrections are made per brand line. Correcting a whole caliber (Controls) to 0 zeroes each line.

## [0.7.1] — 2026-09-24

### Changed
- **Settings vs Controls:** Settings now manages the app itself (security, backups, restore, import/export, display, Heads Up bar, About). Controls customizes the pages, organized by page (Home, Armory, Ammo, Courses of Fire, Range Sessions, Documents), with its own search and Expand / Collapse All. It now holds all the dropdown lists plus the defaults, thresholds, dashboard layout, and bulk count corrections that used to be in Settings.
- Confirmations (deletes, restore, leaving with unsaved changes, and so on) and Back Up Now results now appear in TAC-LOG's own style instead of the Mac or Windows system boxes.
- The version number shows under "Powered by Precision Systems" in the footer.

### Fixed
- The "?" help icons sit on the same line as their label instead of on a line of their own.
- Saving one section of settings no longer touches the other sections.

## [0.7.0] — 2026-09-24

### Added
- **Count corrections:** "Correct count" on each caliber (Ammo) and on each firearm's Shots Fired sets the real number. It's saved as a dated correction you can remove, and history, stats, and cost per round stay intact. Correcting a firearm doesn't change its cleaning counter.
- **Settings › Counts:** correct many firearms or calibers at once, or fill with 0. Confirm by typing RESET; a safety copy of the database is saved first (and an automatic backup runs if a folder is set).
- **Part Counters:** track rounds on a barrel, recoil spring, and so on, with an optional replace-at count. "Replaced" starts the counter over and logs the swap in maintenance.
- **Permits & Documents** (new Documents tab): carry permits, NFA tax stamps and Form 4 status, memberships, licenses, with scans. Expiration warnings on the dashboard, adjustable in Settings › Reminders.
- **Heads Up bar:** when TAC-LOG opens or unlocks, a dismissible bar lists cleaning due, low ammo, expiring documents, and parts due. It can be turned off.
- **Range Day:** log a whole trip on one screen, with every firearm, rounds, caliber, lot, and an optional course and score. Round counts, cleaning counters, ammo on hand, and the range log update together.
- **Par Timer:** run a course string by string with a random-delay start beep and a par beep at each string's time limit, or use the free timer for dry fire. Space starts and stops.
- **Range Bag Checklist:** a ready-made packing list you can edit, tick off, reset, and print. Add more lists (e.g. Hunting).
- **Quick search (Cmd/Ctrl+K):** jump to any firearm (name, nickname, serial), accessory, course, document, range session, page, or setting.
- **Help page** with short guides and an FAQ (works offline), plus "?" tips on fields that aren't obvious.
- **Helpful empty screens** that say what to do next, with buttons.
- **Light theme** and a **larger text** option (Settings › Display).
- File menu: Help (F1).

### Changed
- Settings: "Courses of Fire" and "Spreadsheets" are combined into one **Import / Export** section.
- The tour covers Documents and quick search.

## [0.6.0] — 2026-09-24

### Added
- Course of Fire categories: tag each course Handgun, Rifle, Shotgun, or any mix with checkboxes. The list is editable in Controls (add Carbine, PCC, and so on). Tags show on every course, and the Courses of Fire page has category filters and search.
- One-time "Categorize Courses" screen for existing courses, with suggestions pre-ticked from each course's content.
- Import several course files at once. A review screen lists every course with category checkboxes, flags courses that will update an existing one, and won't import until each has a category. Exported course files now include categories.
- When logging a range session, firearms that match the course's category are listed first.
- Stats by category: sessions, average, best, and pass rate.
- Home button at the front of the tab bar, with the current tab highlighted.
- Settings sections fold open and closed, with a search box and Expand All / Collapse All.
- Dashboard sections fold open and closed, and TAC-LOG remembers which you left open.
- Click anywhere on a row to open it: Armory, Range Log, Accessories, and Ammo purchases.
- New defaults: Grader Date follows the session date; default ammo manufacturer and type for Log Ammo Purchase.
- "Add Another Like This" on a firearm copies it without the serial number, purchase details, or logs.
- First-run setup (your name, date format, optional PIN) and a skippable tour of every tab. Replay it from Settings > About or File > Take the Tour.
- File menu: Back Up Now, Open Data Folder, Lock, What's New, Take the Tour.

### Fixed
- "Today" in date fields used UTC, so evening entries in the US could default to tomorrow's date. Dates now use your computer's local date.

## [0.5.1] — 2026-09-23

### Added
- Drag-and-drop upload boxes replace every "Choose Files / No file chosen" control. Photos and documents upload as soon as you drop or pick them, and you can paste a copied image or screenshot with Cmd/Ctrl+V.
- Full-size photo viewer: click a photo to see it large, step through the rest with the arrows, Esc to close.
- Armory:
  - total count that opens a breakdown by platform and by caliber
  - purchase date under each firearm
  - click any column to sort, including by name and purchase date
  - Active / Stored / Sold / All filter
- New display option: Make/Model (Nickname).
- Show-password button on the unlock screen and every password field.
- Warning before leaving the Course Builder or an edit form with unsaved changes.
- TAC-LOG reopens at the window size and position you left it.

### Changed
- The top tab bar stays in place when you scroll.
- "Record a sale or transfer" and the Edit links on log entries are now proper buttons.
- The redundant Weapon Used box is gone from Log a Range Session. Printed scorecards fill the Weapon line from the firearm you pick, and older sessions keep what was typed there.
- Armory column header reads "Firearm", and search matches nicknames.

### Fixed
- Autofilled fields (like Caliber and Weather) no longer turn light blue.
- Upload and backup times show in your local time instead of UTC.
- The Stats score chart uses your date format.

## [0.5.0] — 2026-09-23

### Added
- Firearm nicknames, with a setting to show the nickname, the make/model, or both.
- Automatic backups on a schedule to a folder you choose, keeping the most recent copies, plus a safety copy of the database before every upgrade.
- US date format (MM/DD/YYYY) option.
- "What's New" screen in Settings → About showing this changelog, with a one-time notice after each update.
- New brand identity: amber stencil TL icon on olive (rounded tile on macOS), Courier New throughout, "TAC-LOG" header, "Powered by Precision Systems" in the footer and About.

### Changed
- The app uses the full window width. The Course Builder string table fits without sideways scrolling.

### Security
- Local server lockdown: a per-launch secret and Host checks, so only the TAC-LOG window can talk to its built-in server.
- Password-protected (encrypted) backups.
- Optional encryption of the database itself, with a printed recovery key. When encryption is on, a password (8+ characters) replaces the PIN.
- Consistent wrong-attempt cooldown for the PIN, password, recovery key, and backup password. Waits escalate from 30 seconds up to 60 minutes, with a live countdown, and restarting the app no longer resets it.
- Auto-lock when the computer sleeps or the screen locks.
- Photos, receipts, and documents are encrypted too when database encryption is on, along with the safety copies TAC-LOG keeps.
- Electron hardening: the built-in server runs in its own utility process, the window is sandboxed with a content security policy and blocked navigation, and debugging and run-as-Node switches are turned off in shipped builds.

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
