// electron-builder's own "extraResources" glob copier drops the prepared
// server bundle's node_modules folder (and is unreliable about dotfiles
// like .next/) for reasons that weren't worth chasing further — a plain
// recursive filesystem copy, run as an afterPack hook, sidesteps the glob
// matching entirely and just copies electron/resources/server byte for
// byte into the packaged app's resources/server, exactly as prepared by
// scripts/prepare-electron.js.

const fs = require("fs");
const path = require("path");

module.exports = async function afterPack(context) {
  const src = path.join(__dirname, "..", "electron", "resources", "server");
  if (!fs.existsSync(src)) {
    throw new Error(
      `afterPack: ${src} is missing. Run "npm run electron:prepare" (or "npm run dist", which does ` +
        `it for you) instead of calling electron-builder directly.`
    );
  }

  const resourcesDir =
    context.electronPlatformName === "darwin"
      ? path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`, "Contents", "Resources")
      : path.join(context.appOutDir, "resources");

  const dest = path.join(resourcesDir, "server");
  fs.rmSync(dest, { recursive: true, force: true });
  fs.cpSync(src, dest, { recursive: true });
  console.log(`after-pack: copied server bundle to ${dest}`);
};
