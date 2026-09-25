const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const md = fs.readFileSync(path.join(root, "CHANGELOG.md"), "utf8");
const out = `export const CHANGELOG_MD = ${JSON.stringify(md)};\n`;
const target = path.join(root, "src", "lib", "changelog-data.ts");
if (!fs.existsSync(target) || fs.readFileSync(target, "utf8") !== out) fs.writeFileSync(target, out);
