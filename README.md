# TAC Systems

Desktop apps by TAC Systems. Everything runs on the user's own computer: no cloud, no accounts.

## Apps

| App | What it is | Current version | Docs |
| --- | --- | --- | --- |
| **TAC-LOG** | Personal firearm inventory, ammo, courses of fire, range sessions | 0.9.0 | `apps/tac-log/CHANGELOG.md`, `SETUP.md` |
| **TAC-QUAL** | Instructor app: classes, student roster, multi-shooter qualifications | 0.2.0 | `apps/tac-qual/CHANGELOG.md` |
| **TAC-QUAL BLUE** | Agency build of TAC-QUAL | not started | — |

## Layout

- `core/`: shared parts (courses of fire, target types, scoring, par timer, security, backups, design system)
- `apps/tac-log/`: the personal app
- `apps/tac-qual/`: the instructor app

Each app keeps its own name, icon, data folder, version number and changelog.

Core never imports an app. Shared components take the app's own server actions as props, and each app keeps a thin wrapper that binds them, so a change for one app cannot move the other.

## Releases

Tags are per app: `tac-log-v0.9.0`, `tac-qual-v0.2.0`, `tac-qual-blue-v*`. Pushing one builds that app on macOS and Windows runners and publishes to its public Releases repository. A change to the shared core is tested in both apps before either is released.

## Building

See `SETUP.md`. From an app folder: `npm run build`, then installers with `npm run dist:mac` / `npm run dist:win`.
