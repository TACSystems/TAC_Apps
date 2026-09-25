const path = require("path");
const startShell = require("./core/shell");

startShell({
  productName: "TAC-QUAL",
  preferredPort: 47421,
  appDir: path.join(__dirname, ".."),
  serverEntry: path.join("apps", "tac-qual", "server.js"),
  seedFileName: "courses-of-fire.seed.json",
  iconPath: path.join(__dirname, "icon.png"),
  preloadPath: path.join(__dirname, "preload.js"),
  backgroundColor: "#17191b",
  releases: { owner: "TACSystems", repo: "TAC-QUAL-Releases", installerPattern: /^TAC-QUAL-Setup-.*\.exe$/i },
});
