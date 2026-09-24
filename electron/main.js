// TAC-LOG desktop shell.

const { app, BrowserWindow, Menu, shell, dialog, ipcMain, powerMonitor, screen, session, utilityProcess } = require("electron");
const path = require("path");
const fs = require("fs");
const net = require("net");
const http = require("http");
const crypto = require("crypto");

const isDev = !app.isPackaged;
const PREFERRED_PORT = 47411;
const LAUNCH_COOKIE = "taclog_launch";
const launchSecret = crypto.randomBytes(32).toString("hex");

let serverProcess = null;
let mainWindow = null;
let serverPort = null;
let backupTimer = null;

function resourcesRoot() {
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

function windowStateFile() {
  return path.join(app.getPath("userData"), "window-state.json");
}

function loadWindowState() {
  const fallback = { width: 1440, height: 940 };
  try {
    const st = JSON.parse(fs.readFileSync(windowStateFile(), "utf8"));
    if (!(st.width >= 960 && st.height >= 640)) return fallback;
    if (typeof st.x === "number" && typeof st.y === "number") {
      const area = screen.getDisplayMatching({ x: st.x, y: st.y, width: st.width, height: st.height }).workArea;
      const visible =
        st.x < area.x + area.width - 100 && st.x + st.width > area.x + 100 && st.y >= area.y - 20 && st.y < area.y + area.height - 100;
      if (!visible) return { width: Math.min(st.width, area.width), height: Math.min(st.height, area.height), maximized: st.maximized };
    }
    return st;
  } catch {
    return fallback;
  }
}

function trackWindowState(win) {
  let timer = null;
  const save = () => {
    if (win.isDestroyed()) return;
    const maximized = win.isMaximized() || win.isFullScreen();
    const b = maximized ? win.getNormalBounds() : win.getBounds();
    try {
      fs.writeFileSync(windowStateFile(), JSON.stringify({ ...b, maximized }));
    } catch {}
  };
  const soon = () => {
    clearTimeout(timer);
    timer = setTimeout(save, 400);
  };
  win.on("resize", soon);
  win.on("move", soon);
  win.on("maximize", soon);
  win.on("unmaximize", soon);
  win.on("close", save);
}

function findFreePort(preferred) {
  return new Promise((resolve, reject) => {
    const tester = net.createServer();
    tester.unref();
    tester.on("error", () => {
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

function waitForServer(port, timeoutMs = 30000) {
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
    throw new Error(`Couldn't find the built server at ${entry}. Run "npm run electron:prepare" first.`);
  }

  const port = await findFreePort(PREFERRED_PORT);
  const dir_ = ensureDataDir();

  serverProcess = utilityProcess.fork(entry, [], {
    cwd: dir,
    serviceName: "TAC-LOG Server",
    stdio: isDev ? "inherit" : "ignore",
    env: {
      ...process.env,
      NODE_ENV: "production",
      PORT: String(port),
      HOSTNAME: "127.0.0.1",
      FIREARMS_DB_DIR: dir_,
      TAC_LOG_VERSION: app.getVersion(),
      TAC_LOG_LAUNCH_SECRET: launchSecret,
      NEXT_TELEMETRY_DISABLED: "1",
    },
  });

  serverProcess.on("exit", (code) => {
    serverProcess = null;
    if (code && mainWindow) console.error(`TAC-LOG server exited unexpectedly (code ${code}).`);
  });

  await waitForServer(port);
  serverPort = port;
  return port;
}

function origin() {
  return `http://127.0.0.1:${serverPort}`;
}

async function callServer(route) {
  if (!serverPort) return null;
  try {
    const res = await fetch(`${origin()}${route}`, {
      method: "POST",
      headers: { Cookie: `${LAUNCH_COOKIE}=${launchSecret}` },
    });
    return res.ok ? res.json() : null;
  } catch {
    return null;
  }
}

async function lockApp() {
  await callServer("/api/lock");
  for (const w of BrowserWindow.getAllWindows()) {
    if (w !== mainWindow) w.close();
  }
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.reload();
}

function buildMenu() {
  const template = [
    {
      label: "TAC-LOG",
      submenu: [{ role: "about" }, { type: "separator" }, { label: "Lock", accelerator: "CmdOrCtrl+L", click: () => lockApp() }, { type: "separator" }, { role: "quit" }],
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

function hardenContents(contents) {
  contents.on("will-navigate", (event, url) => {
    if (!url.startsWith(origin())) {
      event.preventDefault();
      if (/^https?:/.test(url)) shell.openExternal(url);
    }
  });
  contents.on("will-attach-webview", (event) => event.preventDefault());
  contents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(origin())) {
      return {
        action: "allow",
        overrideBrowserWindowOptions: {
          autoHideMenuBar: true,
          webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
        },
      };
    }
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
}

async function createWindow() {
  if (!serverPort) await startServer();

  await session.defaultSession.cookies.set({
    url: origin(),
    name: LAUNCH_COOKIE,
    value: launchSecret,
    httpOnly: true,
    sameSite: "strict",
  });

  const state = loadWindowState();
  mainWindow = new BrowserWindow({
    width: state.width,
    height: state.height,
    ...(typeof state.x === "number" && typeof state.y === "number" ? { x: state.x, y: state.y } : {}),
    minWidth: 960,
    minHeight: 640,
    backgroundColor: "#0a0b08",
    title: "TAC-LOG",
    icon: path.join(__dirname, "icon.png"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webviewTag: false,
      devTools: isDev,
      preload: path.join(__dirname, "preload.js"),
    },
  });
  if (state.maximized) mainWindow.maximize();
  trackWindowState(mainWindow);
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.loadURL(origin());
  mainWindow.webContents.once("did-finish-load", () => callServer("/api/auto-backup"));
}

app.on("web-contents-created", (_e, contents) => hardenContents(contents));

ipcMain.handle("taclog:choose-folder", async (event) => {
  if (!event.senderFrame || !event.senderFrame.url.startsWith(origin())) return null;
  const win = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showOpenDialog(win, {
    title: "Choose a folder for TAC-LOG backups",
    properties: ["openDirectory", "createDirectory"],
  });
  return result.canceled || !result.filePaths.length ? null : result.filePaths[0];
});

app.whenReady().then(async () => {
  session.defaultSession.setPermissionRequestHandler((_wc, _perm, cb) => cb(false));
  buildMenu();
  try {
    await createWindow();
  } catch (err) {
    console.error(err);
    dialog.showErrorBox("TAC-LOG couldn't start", String(err && err.message ? err.message : err));
    app.quit();
    return;
  }

  powerMonitor.on("suspend", () => lockApp());
  powerMonitor.on("lock-screen", () => lockApp());
  backupTimer = setInterval(() => callServer("/api/auto-backup"), 30 * 60 * 1000);
  powerMonitor.on("resume", () => callServer("/api/auto-backup"));

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  if (backupTimer) clearInterval(backupTimer);
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
});
