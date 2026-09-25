const path = require("path");
const startShell = require("./core/shell");

startShell({
  productName: "TAC-LOG",
  preferredPort: 47411,
  appDir: path.join(__dirname, ".."),
  serverEntry: path.join("apps", "tac-log", "server.js"),
  seedFileName: "courses-of-fire.seed.json",
  iconPath: path.join(__dirname, "icon.png"),
  preloadPath: path.join(__dirname, "preload.js"),
  releases: { owner: "TACSystems", repo: "TAC-LOG-Releases", installerPattern: /^TAC-LOG-Setup-.*\.exe$/i },
});
