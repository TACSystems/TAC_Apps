# TAC-LOG — Setup

TAC-LOG (by Precision Systems) runs entirely on your own computer. There is
no cloud account, no sign-up, and no server anywhere else involved — your
data lives in a single file (`data/firearms.db`) right next to the app, and
nothing about it is ever sent over a network. Anyone else who downloads
this app runs their own independent copy with their own independent
database file; nobody's data ever touches anyone else's.

## Requirements

- Node.js 20 or newer (Node 22 recommended). If you don't have it:
  https://nodejs.org

## 1. Install and run

```
npm install
npm run build
npm run start
```

Open http://localhost:3000. The database file and your five Courses of
Fire are created automatically the first time the app runs — nothing to
configure.

For day-to-day development instead of a production build, `npm run dev`
works too.

## 2. Where your data lives

Everything is in `data/firearms.db` (a standard SQLite file) in this
project folder, with any uploaded receipt images alongside it in
`data/receipts/`. Back it up like any other file — or use the **Export
Database** button on the Controls page to download a timestamped copy of
`firearms.db` whenever you want. Moving the app to a new computer is just
copying this whole folder, `data/firearms.db` and `data/receipts/`
included.

## 3. What's in the app

TAC-LOG is split into two fully separate sides: your own **personal**
records, and an optional **Group** section for tracking range days with
other people. Nothing on the Group side is ever mixed into your personal
Range Log or Stats, and vice versa.

### Personal

- **Armory** — your firearms, with purchase details, status, cost tracking
  (purchase value plus linked accessories), a serialized accessories log
  (optics, suppressors, etc.), and for each firearm:
  - **Receipts** — upload photos or PDFs of purchase receipts, stored
    locally next to your database
  - **Maintenance / Cleaning** — a cleaning log, plus a "clean every N
    rounds" setting that flags a firearm as due once you've fired enough
    rounds since the last logged cleaning
  - **Malfunction History** — log stoppages with round count, type, and
    cause, rolled into a lifetime malfunction count on the firearm
  - **Zero Log** — record zero sessions (distance, optic, ammo, adjustments
    made) so you can track a given optic/load combo over time
- **Ammo** — purchase log with manufacturer, type, caliber, grain, and lot
  number; per-caliber goals; on-hand quantity (purchased minus rounds fired
  through logged range runs)
- **Courses of Fire** — your COFs as a phase-by-phase, string-by-string
  reference, with a live search bar and a blank printable scorecard for
  each
- **Log a Run** — a digital version of the scoring card: pick a course,
  pick a firearm, note the ammo lot used, fill in zone counts, it computes
  total points and final score % automatically and saves it to the Range
  Log; the filled-in scorecard can be printed straight from the saved
  entry
- **Range Log** — history of every logged personal run, searchable by
  course, firearm, or date
- **Stats** — score-over-time chart per course of fire, broken out by
  firearm, with your personal best for that course and a table view
  underneath

### Group (optional)

- **Participants** — an optional roster of the people you shoot with:
  name, contact info, status, notes. Kept entirely separate from your own
  armory data.
- **Log Group Range Day** — from any Course of Fire, log a group session:
  pick a participant, optionally link one of *your own* catalogued
  firearms if you lent it out, and record a general weapon description
  (e.g. "AR-15") and caliber for whatever they actually shot. The Group
  side deliberately never records serial numbers or any other identifying
  detail about a participant's own firearm — only what you'd need for your
  own notes.
- **Group Log** — history of every logged group session
- **Group Stats** — score-over-time chart per course of fire, broken out
  by participant, with a table view underneath

### Everything else

- **Search** — a global search box across your armory, ammo purchases,
  courses of fire, and personal range log
- **Controls** — manage the dropdown option lists used throughout the app
  (firearm platforms, calibers, ammo types, malfunction types, etc.), and
  the **Export Database** backup button

## 4. Updating or adding Courses of Fire later

The five courses that ship with the app came from your Courses of Fire
spreadsheet. If you update that spreadsheet later — fix a string, add a
new course entirely — you don't need to touch code or rebuild the app:

1. Run the export script against your updated spreadsheet:
   ```
   python3 sql/generate_cof_json.py "Courses of Fire.xlsx" my-cof-update.json
   ```
   (Needs `openpyxl`: `pip install openpyxl --break-system-packages` if it's not already installed.)
2. Hand `my-cof-update.json` to yourself or anyone else running the app —
   however you'd normally send a file (email, USB drive, shared folder).
3. In the app, go to **Courses of Fire → Import Updates**, choose that
   file, and click Import.

The import only ever touches Course of Fire reference data (courses,
phases, strings, scoring zones). It never touches anyone's firearms, ammo,
range log, participants, or group log — those stay exactly as they were. A
course already on file (matched by its Document ID / code) gets its name,
phase titles, and strings updated to match the new file; a course with a
new code gets added as a new course. Nothing is deleted from a person's
own data by this.

## 5. Building the double-click desktop app (Electron)

Steps 1–4 above run TAC-LOG as a local web app (`npm run start`, open a
browser tab). There's also a desktop-app build that wraps that same app in
its own window — no terminal, no browser tab, no "start the server first."
It's the same code either way; this just packages it differently.

**Requirements:** the same Node.js as above, run on the operating system
you're building *for* (see why below).

```
npm install
npm run dist:mac      # produces a .dmg under release/, for macOS
npm run dist:win      # produces a setup .exe under release/, for Windows
npm run dist          # builds for whatever OS you're running this on
```

A few things worth knowing about this part specifically:

- **You need to build on the OS you're targeting.** TAC-LOG's database
  library (`better-sqlite3`) is a native module — the copy that gets
  bundled has to match the operating system it will run on, and that
  match happens automatically the moment you run `npm install` on that
  OS. Build the Mac installer on a Mac, the Windows installer on Windows.
  Building a Windows .exe from a Mac (or vice versa) isn't reliable and
  isn't set up here.
- **If you want both installers and don't have both a Mac and a Windows
  machine:** this repo includes a GitHub Actions workflow
  (`.github/workflows/build-desktop.yml`) that builds both on GitHub's own
  Mac and Windows machines and hands you back the finished installers —
  push this project to a GitHub repo, open the **Actions** tab, and run
  "Build TAC-LOG desktop app" manually (or push a tag like `v1.0.0` to
  also attach them to a release automatically). No cost for a public
  repo; a private repo uses a small amount of GitHub's free monthly
  Actions minutes.
- **The installer isn't code-signed.** Signing costs money (an Apple
  Developer account, or a Windows code-signing certificate) and isn't set
  up here. Unsigned means macOS Gatekeeper and Windows SmartScreen will
  both show an "unknown developer" warning the first time the app opens —
  right-click → Open on Mac, or "More info → Run anyway" on Windows,
  gets past it. This is standard for small/independent apps; worth
  revisiting if you ever plan to distribute this more widely.
- **Where the desktop app's data lives.** The installed app runs from a
  read-only folder on both Mac and Windows, so the desktop build keeps
  `firearms.db` and `data/receipts/` in your OS's normal per-app data
  folder instead of next to the app itself (`~/Library/Application
  Support/TAC-LOG` on Mac, `%APPDATA%\TAC-LOG` on Windows) — same Export
  Database backup button on Controls works exactly the same way there.
- **`npm run electron:dev`** runs the desktop shell against your current
  code without packaging an installer — the fastest loop while you're
  changing something and want to see it in the actual app window.

## 6. Running this on more than one of your own devices

Since there's no server, each device has its own separate `data/firearms.db`.
If you want the same data on your laptop and your desktop, the simplest
approach is copying the `data/firearms.db` file (and `data/receipts/` if
you use receipt uploads) between them after using one — there's no
automatic sync, though the Export Database button on Controls gives you an
easy file to move around. If that becomes a real need later (rather than
just wanting your phone to see it too), that's a bigger design decision —
worth a separate conversation when you get there.

## 7. If you eventually want to share this with a larger group (not just solo use)

The current design is one person, one database, one machine, with an
optional lightweight roster for group range days you personally log — the
most private option that still covers shooting with others. If down the
road you want a shooting club or team to each see and update one shared
pool of data instead of everyone running an island, that needs a different
setup (a small shared server on hardware you control, with accounts). Say
the word when you're there and we can design that as its own mode rather
than retrofitting it.
