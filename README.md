# Precision Systems

Desktop apps by Precision Systems. Everything runs on the user's own computer: no cloud, no accounts.

## Apps

| App | What it is | Current version | Docs |
| --- | --- | --- | --- |
| **TAC-LOG** | Personal firearm inventory, ammo, courses of fire, range sessions | 0.8.0 | `CHANGELOG.md`, `SETUP.md` |
| **Instructor app** (name to be chosen) | Classes, student roster, multi-shooter qualifications | not started (0.1.0 planned) | — |

## Layout

Today this repository holds TAC-LOG at the root. TAC-LOG 0.9.0 splits it into:

- `core/`: shared parts (courses of fire, target types, scoring, par timer, security, backups, design system)
- `apps/tac-log/`: the personal app
- `apps/<instructor>/`: the instructor app

Each app keeps its own name, icon, data folder, version number and changelog.

## Releases

Tags are per app: `tac-log-v0.8.0`, and later `<instructor>-v0.1.0`. A change to the shared core is tested in both apps before either is released.

## Building TAC-LOG

See `SETUP.md`. Installers: `npm run dist:mac` / `npm run dist:win`.
