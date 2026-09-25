const W = process.env.TL_WORK || "/tmp/tl-test";
import http from "http";
import fs from "fs";
const port = 4777;
const NEXT = process.env.TL_VERSION.replace(/(\d+)$/, (m) => String(Number(m) + 1));
const release = {
  tag_name: "v" + NEXT,
  name: "TAC-LOG " + NEXT,
  html_url: "https://github.com/TACSystems/TAC-LOG-Releases/releases/tag/v" + NEXT,
  published_at: "2026-10-01T00:00:00Z",
  body: "### Fixed\n- Test release notes.",
  assets: [
    { name: `TAC-LOG-Setup-${NEXT}.exe`, browser_download_url: `http://127.0.0.1:${port}/dl/TAC-LOG-Setup-${NEXT}.exe` },
    { name: "SHA256SUMS.txt", browser_download_url: `http://127.0.0.1:${port}/dl/SHA256SUMS.txt` },
  ],
};
http.createServer((req, res) => {
  fs.appendFileSync(W + "/upd/requests.log", `${req.method} ${req.url} ${req.headers["user-agent"]}\n`);
  if (req.url === "/repos/TACSystems/TAC-LOG-Releases/releases/latest") {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify(release));
  }
  if (req.url.startsWith("/dl/")) {
    const f = W + "/upd/" + req.url.slice(4);
    if (fs.existsSync(f)) { const b = fs.readFileSync(f); res.writeHead(200, { "content-length": b.length }); return res.end(b); }
  }
  res.writeHead(404); res.end();
}).listen(port, "127.0.0.1", () => console.log("mock up"));
