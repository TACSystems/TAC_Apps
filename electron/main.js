// TAC-LOG desktop shell.
//
// This does not reimplement the app — it spawns the same Next.js server
// this project runs in the browser (built with `output: "standalone"`)
// as a background process bound to 127.0.0.1, points a normal Electron
// window at it, and shuts the server down when the window closes.
//
// The database and any uploaded receipt images live under Electron's
// per-OS "userData" directory (NOT inside the installed app folder,
// which is read-only once installed on both macOS and Windows) — see
// dataDir below. That's a new location compared to running this project
// with `npm run dev` / `npm run start`, where the data/ folder next to
// the project is used instead; both paths go through the same
// FIREARMS_DB_DIR override already built into src/lib/db/index.ts.

const { app, BrowserWindow, Menu, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const net = require("net");
const { spawn } = require("child_process");
const http = require("http");

const isDev = !app.isPackaged;
const PREFERRED_PORT = 47411;

let serverProcess = null;
let mainWindow = null;

function resourcesRoot() {
  // In dev, run against the repo's own .next/standalone build (you must
  // `npm run build` first). Packaged, electron-builder's extraResources
  // puts our prepared server + seed data under process.resourcesPath.
  return isDev ? path.join(__dirname, "..") : process.resourcesPath;
}

function serverDir() {
  return isDev
    ? path.join(resourcesRoot(), ".next", "standalone")
    : path.join(resourcesRoot(), "server");
}

function seedFile() {
  return isDev
    ? path.join(resourcesRoot(), "data", "courses-of-fire.seed.json")
    : path.join(resourcesRoot(), "seed", "courses-of-fire.seed.json");
}

function dataDir() {
  return path.join(app.getPath("userData"), "data");
}

function ensureDataDir() {
  const dir = dataDir();
  fs.mkdirSync(dir, { recursive: true });
  const seedDest = path.join(dir, "courses-of-fire.seed.json");
  if (!fs.existsSync(seedDest) && fs.existsSync(seedFile())) {
    fs.copyFileSync(seedFile(), seedDest);
  }
  return dir;
}

function findFreePort(preferred) {
  return new Promise((resolve, reject) => {
    const tester = net.createServer();
    tester.unref();
    tester.on("error", () => {
      // Preferred port is busy — let the OS hand us any free one instead.
      const fallback = net.createServer();
      fallback.unref();
      fallback.listen(0, "127.0.0.1", () => {
        const port = fallback.address().port;
        fallback.close(() => resolve(port));
      });
      fallback.on("error", reject);
    });
    tester.listen(preferred, "127.0.0.1", () => {
      tester.close(() => resolve(preferred));
    });
  });
}

function waitForServer(port, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    function attempt() {
      const req = http.get({ host: "127.0.0.1", port, path: "/", timeout: 1500 }, (res) => {
        res.resume();
        resolve();
      });
      req.on("error", () => {
        if (Date.now() > deadline) {
          reject(new Error("TAC-LOG server did not start in time."));
        } else {
          setTimeout(attempt, 300);
        }
      });
      req.on("timeout", () => req.destroy());
    }
    attempt();
  });
}

async function startServer() {
  const dir = serverDir();
  const entry = path.join(dir, "server.js");
  if (!fs.existsSync(entry)) {
    throw new Error(
      `Couldn't find the built server at ${entry}. Run "npm run build" (and, for a packaged app, ` +
        `"npm run electron:prepare") before starting or packaging the desktop app.`
    );
  }

  const port = await findFreePort(PREFERRED_PORT);
  const dir_ = ensureDataDir();

  serverProcess = spawn(process.execPath, [entry], {
    cwd: dir,
    env: {
      ...process.env,
      NODE_ENV: "production",
      PORT: String(port),
      HOSTNAME: "127.0.0.1",
      FIREARMS_DB_DIR: dir_,
      TAC_LOG_VERSION: app.getVersion(),
      ELECTRON_RUN_AS_NODE: "1",
    },
    stdio: isDev ? "inherit" : "ignore",
  });

  serverProcess.on("exit", (code) => {
    if (code && code !== 0 && mainWindow) {
      console.error(`TAC-LOG server exited unexpectedly (code ${code}).`);
    }
  });

  await waitForServer(port);
  return port;
}

function buildMenu() {
  const template = [
    {
      label: "TAC-LOG",
      submenu: [
        { role: "about" },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
        ...(isDev ? [{ role: "toggleDevTools" }] : []),
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

async function createWindow() {
  const port = await startServer();

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: "#0a0b08",
    title: "TAC-LOG",
    icon: path.join(__dirname, "icon.png"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Anything that isn't a plain in-app navigation (an external link, a
  // "print scorecard" target="_blank") opens in the OS browser instead of
  // spawning a second Electron window.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(`http://127.0.0.1:${port}`)) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  mainWindow.loadURL(`http://127.0.0.1:${port}`);
}

app.whenReady().then(async () => {
  buildMenu();
  try {
    await createWindow();
  } catch (err) {
    console.error(err);
    app.quit();
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill();
  }
});
