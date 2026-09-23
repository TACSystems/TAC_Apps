// Assembles electron/resources/ from a finished `next build` — this is
// what electron-builder's "extraResources" config (see package.json)
// bundles into the packaged app as process.resourcesPath. Run this after
// `npm run build`, before `npm run dist`; `npm run electron:prepare`
// does both build steps for you.
//
// Not needed for `npm run electron:dev` — dev mode runs straight out of
// .next/standalone (see electron/main.js's resourcesRoot()).

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const standaloneDir = path.join(root, ".next", "standalone");
const staticDir = path.join(root, ".next", "static");
const publicDir = path.join(root, "public");
const seedSrc = path.join(root, "data", "courses-of-fire.seed.json");

const outDir = path.join(root, "electron", "resources");
const serverOut = path.join(outDir, "server");
const seedOutDir = path.join(outDir, "seed");

function fail(msg) {
  console.error(`\nprepare-electron: ${msg}\n`);
  process.exit(1);
}

if (!fs.existsSync(standaloneDir)) {
  fail(
    `${standaloneDir} doesn't exist. Run "npm run build" first (next.config.ts already sets ` +
      `output: "standalone", so a normal build produces it).`
  );
}
if (!fs.existsSync(seedSrc)) {
  fail(`${seedSrc} is missing — it should already be checked into data/.`);
}

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(serverOut, { recursive: true });
fs.mkdirSync(seedOutDir, { recursive: true });

fs.cpSync(standaloneDir, serverOut, { recursive: true });

for (const stray of ["data", "src", "electron", "scripts", "release", "sql", "tsconfig.tsbuildinfo", "package-lock.json", "AGENTS.md", "CLAUDE.md", "README.md", "SETUP.md", "eslint.config.mjs", "next.config.ts", "node_modules/@img", "node_modules/sharp"]) {
  fs.rmSync(path.join(serverOut, stray), { recursive: true, force: true });
}

const hashedModules = path.join(serverOut, ".next", "node_modules");
if (fs.existsSync(hashedModules)) {
  for (const entry of fs.readdirSync(hashedModules)) {
    const full = path.join(hashedModules, entry);
    if (!fs.lstatSync(full).isSymbolicLink()) continue;
    const target = fs.realpathSync(full);
    const pkg = JSON.parse(fs.readFileSync(path.join(target, "package.json"), "utf8")).name;
    fs.rmSync(full, { force: true });
    fs.mkdirSync(full, { recursive: true });
    fs.writeFileSync(path.join(full, "package.json"), JSON.stringify({ name: entry, main: "index.js" }, null, 2));
    fs.writeFileSync(path.join(full, "index.js"), `module.exports = require(${JSON.stringify(pkg)});\n`);
  }
}

// Per the Next.js standalone-output docs, static assets and the public/
// folder aren't included automatically — copy them in ourselves.
fs.mkdirSync(path.join(serverOut, ".next", "static"), { recursive: true });
fs.cpSync(staticDir, path.join(serverOut, ".next", "static"), { recursive: true });
if (fs.existsSync(publicDir)) {
  fs.cpSync(publicDir, path.join(serverOut, "public"), { recursive: true });
}

const prebuildsSrc = path.join(root, "node_modules", "better-sqlite3-multiple-ciphers", "prebuilds");
const prebuildsOut = path.join(serverOut, "node_modules", "better-sqlite3-multiple-ciphers", "prebuilds");
if (fs.existsSync(prebuildsSrc)) {
  fs.cpSync(prebuildsSrc, prebuildsOut, { recursive: true });
}

fs.copyFileSync(seedSrc, path.join(seedOutDir, "courses-of-fire.seed.json"));

console.log(`prepare-electron: wrote ${outDir}`);
