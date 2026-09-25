const { app, net, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { spawn } = require("child_process");

function parseVersion(v) {
  const m = String(v || "").match(/(\d+)\.(\d+)\.(\d+)/);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

function isNewer(candidate, current) {
  const a = parseVersion(candidate);
  const b = parseVersion(current);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] > b[i];
  }
  return false;
}

function createUpdater({ owner, repo, productName, installerPattern, notify }) {
  const installsItself = process.platform === "win32" || (!app.isPackaged && process.env.TACLOG_UPDATE_TEST_INSTALL === "1");
  const apiBase = (process.env.TACLOG_UPDATE_API || "https://api.github.com").replace(/\/$/, "");
  const prefsFile = () => path.join(app.getPath("userData"), "updates.json");
  const downloadDir = () => path.join(app.getPath("userData"), "updates");
  let state = { status: "idle", current: app.getVersion() };
  let busy = false;

  function readPrefs() {
    try {
      const p = JSON.parse(fs.readFileSync(prefsFile(), "utf8"));
      return { autoCheck: p.autoCheck !== false, skip: typeof p.skip === "string" ? p.skip : null };
    } catch {
      return { autoCheck: true, skip: null };
    }
  }

  function writePrefs(patch) {
    const next = { ...readPrefs(), ...patch };
    try {
      fs.writeFileSync(prefsFile(), JSON.stringify(next, null, 2));
    } catch {}
    return next;
  }

  function set(patch) {
    state = { ...state, ...patch, current: app.getVersion() };
    notify(publicState());
  }

  function publicState() {
    const { assetUrl, sumsUrl, file, ...rest } = state;
    void assetUrl;
    void sumsUrl;
    void file;
    return { ...rest, canInstall: installsItself && state.status === "ready", platform: process.platform };
  }

  async function getJson(url) {
    const res = await net.fetch(url, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": `${productName}/${app.getVersion()}` },
    });
    if (!res.ok) throw new Error(res.status === 404 ? "No releases published yet." : `Update server replied ${res.status}.`);
    return res.json();
  }

  async function download(url, dest, onProgress) {
    const res = await net.fetch(url, { headers: { "User-Agent": `${productName}/${app.getVersion()}`, Accept: "application/octet-stream" } });
    if (!res.ok || !res.body) throw new Error(`Download failed (${res.status}).`);
    const total = Number(res.headers.get("content-length")) || 0;
    const hash = crypto.createHash("sha256");
    const out = fs.createWriteStream(dest);
    let got = 0;
    const reader = res.body.getReader();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const buf = Buffer.from(value);
        hash.update(buf);
        got += buf.length;
        if (!out.write(buf)) await new Promise((r) => out.once("drain", r));
        if (total) onProgress(Math.min(99, Math.round((got / total) * 100)));
      }
    } finally {
      await new Promise((r) => out.end(r));
    }
    return hash.digest("hex");
  }

  async function fetchSums(url) {
    const res = await net.fetch(url, { headers: { "User-Agent": `${productName}/${app.getVersion()}`, Accept: "application/octet-stream" } });
    if (!res.ok) throw new Error("Couldn't read the release checksums.");
    const text = await res.text();
    const map = {};
    for (const line of text.split(/\r?\n/)) {
      const m = line.trim().match(/^([a-f0-9]{64})\s+\*?(.+)$/i);
      if (m) map[m[2].trim()] = m[1].toLowerCase();
    }
    return map;
  }

  async function downloadWindows(release) {
    const asset = (release.assets || []).find((a) => installerPattern.test(a.name));
    const sums = (release.assets || []).find((a) => /^SHA256SUMS(\.txt)?$/i.test(a.name));
    if (!asset || !sums) {
      set({ status: "available", note: "The installer isn't attached to this release yet." });
      return;
    }
    fs.mkdirSync(downloadDir(), { recursive: true });
    for (const f of fs.readdirSync(downloadDir())) fs.rmSync(path.join(downloadDir(), f), { force: true });
    const dest = path.join(downloadDir(), asset.name);
    set({ status: "downloading", progress: 0 });
    const expected = (await fetchSums(sums.browser_download_url))[asset.name];
    if (!expected) throw new Error("The release checksums don't list the installer.");
    const actual = await download(asset.browser_download_url, `${dest}.part`, (p) => set({ status: "downloading", progress: p }));
    if (actual !== expected) {
      fs.rmSync(`${dest}.part`, { force: true });
      throw new Error("The downloaded installer didn't match its checksum, so it was discarded.");
    }
    fs.renameSync(`${dest}.part`, dest);
    state.file = dest;
    set({ status: "ready", progress: 100 });
  }

  async function check({ manual = false } = {}) {
    if (busy) return publicState();
    if (!manual && !readPrefs().autoCheck) return publicState();
    busy = true;
    set({ status: "checking", error: null, manual });
    try {
      const release = await getJson(`${apiBase}/repos/${owner}/${repo}/releases/latest`);
      const version = (parseVersion(release.tag_name || release.name) || []).join(".");
      if (!version || !isNewer(version, app.getVersion())) {
        set({ status: "current", version: version || null, manual });
        return publicState();
      }
      const skipped = !manual && readPrefs().skip === version;
      set({
        status: skipped ? "skipped" : "available",
        version,
        notes: String(release.body || "").slice(0, 20000),
        url: release.html_url,
        published: release.published_at || null,
        manual,
      });
      if (!skipped && installsItself) await downloadWindows(release);
    } catch (err) {
      const msg = err && err.message ? err.message : "";
      set({ status: "error", error: /^net::/.test(msg) ? `Couldn't reach GitHub to check for updates (${msg.replace(/^net::/, "")}).` : msg || "Couldn't check for updates.", manual });
    } finally {
      busy = false;
    }
    return publicState();
  }

  function act(action) {
    if (action === "check") return check({ manual: true });
    if (action === "open" && state.url && /^https:\/\/github\.com\//.test(state.url)) shell.openExternal(state.url);
    if (action === "skip" && state.version) {
      writePrefs({ skip: state.version });
      set({ status: "skipped" });
    }
    if (action === "dismiss") set({ status: "dismissed" });
    if (action === "install" && installsItself && state.status === "ready" && !(state.file && fs.existsSync(state.file))) {
      set({ status: "error", error: "The downloaded installer is missing. Use Check Now to download it again." });
    } else if (action === "install" && installsItself && state.status === "ready") {
      try {
        if (process.platform !== "win32") fs.chmodSync(state.file, 0o755);
        const child = spawn(state.file, ["/S", "--updated", "--force-run"], { detached: true, stdio: "ignore" });
        child.once("error", (err) => set({ status: "error", error: `Couldn't start the installer (${err.code || err.message}). Download it from the releases page instead.` }));
        child.once("spawn", () => {
          child.unref();
          set({ status: "installing" });
          setTimeout(() => app.quit(), 300);
        });
      } catch (err) {
        set({ status: "error", error: `Couldn't start the installer (${err.code || err.message}).` });
      }
    }
    return publicState();
  }

  return {
    check,
    act,
    state: publicState,
    prefs: readPrefs,
    setPrefs: (p) => writePrefs({ autoCheck: p && p.autoCheck !== false }),
  };
}

module.exports = { createUpdater, isNewer, parseVersion };
