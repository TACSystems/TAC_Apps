# Testing and release kit

Everything a build task needs to verify and package TAC-LOG. All test data here is made up.

## One-time setup in a fresh workspace

```
testing/lib/setup-tools.sh
```

Installs xvfb, zip, wine (for the Windows installer), rcodesign (Mac ad-hoc signing) and Playwright. Chromium is expected at `/opt/pw-browsers/chromium`; override with `CHROMIUM_PATH`.

## Every release

From `apps/tac-log`:

1. `npm run electron:prepare` (unit tests, production build, packaged server)
2. `../../testing/run-regression.sh` (browser suites, each on a fresh copy of its fixture; exits non-zero on any failure)
3. `../../testing/updater/run.sh` (update checker against a mock GitHub: download, checksum, silent install, missing-installer error)
4. `SKIPBUILD=1 ../../testing/package/dist.sh` (Windows installer, Mac zip, Linux dir; split parts, BUILD-INSTALLER.bat, SHA256SUMS.txt, RELEASE-NOTES.md from CHANGELOG.md)
5. `../../testing/package/smoke.sh` (relocated packaged app: fresh install, then upgrade from the 0.8.0 fixture)

Scratch output goes to `TL_WORK` (default `/tmp/tl-test`). The version under test comes from `apps/tac-log/package.json`; override with `TL_VERSION`.

## Layout

| Path | What |
|---|---|
| `e2e/` | Browser suites by the release that introduced the features (0.5 security → 0.8 sessions and ammo lines) |
| `fixtures/v5` | 0.5-era database with receipts, used for the security and 0.5–0.7 suites (`lib/mkpin.cjs` adds a legacy PIN) |
| `fixtures/v71` | 0.7.1 database, upgraded on first start; used for the 0.8 suites |
| `fixtures/v80` | 0.8.0 database for upgrade checks |
| `updater/` | Mock GitHub releases server and the two updater checks |
| `package/` | Packaging, release kit and packaged smoke test |
| `lib/` | Server starter, PIN helper, table totals (`tot.cjs`), schema doc generator, fixture anonymizer |

## Adding to it

- New feature suites go in `e2e/` and get a `run` line in `run-regression.sh`.
- A schema change needs an upgrade check from the previous release's fixture; add that release's database as a new fixture (made-up data only, run it through `lib/anonymize.cjs` if in doubt).
- Regenerate the schema reference with `node lib/gen-schema.mjs <db> ../apps/tac-log/docs/SCHEMA.md`.
