/* =============================================================================
   serve.js —— 原型编辑器 本地服务(零依赖 Node)
   -----------------------------------------------------------------------------
   由 launcher.js / 原型编辑器 启动器拉起。做三件事:
     1) 在 /  提供「控制页」panel.html(壳):操作说明 + 选原型 + 使用说明 + 停止。
     2) POST /pick  弹原生选文件夹窗(Mac osascript / Win PowerShell),记住所选原型目录。
     3) /proto/*  把所选原型目录当根来服务;POST /proto/save-annotations 写该原型 data/annotations.js。
   另有 GET /ping(心跳)、/bye(关页面即停):没有页面心跳超过 IDLE_MS 就自动退出。
   端口默认 47821(不常用),launcher 会自动挑空闲端口;只在 localhost 可写文件。
   ============================================================================= */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");
const { execFile } = require("child_process");

const crypto = require('crypto');
const notesStore = require('./notes-store');
const { BUILD_ID } = require('./launcher');
const noteSessions = new Map();
const ROOT = __dirname;                 // 编辑器工具目录(panel.html 在这)
const PORT = process.env.PORT || 47821;
const IDLE_MS = Number(process.env.IDLE_MS) || 15000;
let lastPing = Date.now();
// 无全局「当前原型」状态:每个原型走 /p/<base64路径>/,路径写在 URL 里,多标签互不干扰。

const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif",
  ".svg": "image/svg+xml", ".ico": "image/x-icon", ".woff": "font/woff", ".woff2": "font/woff2"
};

function sendFile(abs, res) {
  fs.readFile(abs, function (e, buf) {
    if (e) { res.writeHead(404); res.end("not found"); return; }
    res.writeHead(200, { "Content-Type": MIME[path.extname(abs).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-store" });
    res.end(buf);
  });
}

function pickFolder(cb) {
  if (process.platform === "darwin") {
    execFile("osascript", ["-e", 'POSIX path of (choose folder with prompt "选择要编辑的原型文件夹(里面有 index.html)")'],
      function (e, out) { cb(e ? "" : String(out).trim()); });
  } else if (process.platform === "win32") {
    const ps = "Add-Type -AssemblyName System.Windows.Forms;" +
      "$f=New-Object System.Windows.Forms.FolderBrowserDialog;" +
      "$f.Description='选择要编辑的原型文件夹(里面有 index.html)';" +
      "if($f.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK){[Console]::Out.Write($f.SelectedPath)}";
    execFile("powershell", ["-NoProfile", "-STA", "-Command", ps], function (e, out) { cb(e ? "" : String(out).trim()); });
  } else {
    execFile("zenity", ["--file-selection", "--directory"], function (e, out) { cb(e ? "" : String(out).trim()); });
  }
}

function json(res, status, value) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(value));
}
function sameOrigin(req) {
  const host = req.headers.host || '';
  if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) return false;
  if (req.headers['sec-fetch-site'] === 'cross-site') return false;
  return !req.headers.origin || req.headers.origin === 'http://' + host;
}
function saveToDir(req, res, dir, modern) {
  if (!sameOrigin(req)) return json(res, 403, { ok: false, error: '仅允许本地同源保存' });
  let body = '';
  req.on('data', c => { body += c; if (Buffer.byteLength(body) > 5e6) req.destroy(); });
  req.on('end', () => {
    try {
      const data = JSON.parse(body || '{}');
      if (modern && (!data.token || data.token !== noteSessions.get(dir))) return json(res, 403, { ok: false, error: '编辑会话无效，请刷新页面' });
      const result = modern ? notesStore.save(dir, data) : notesStore.saveLegacy(dir, data);
      lastPing = Date.now();
      json(res, 200, result);
    } catch (e) { json(res, e.status || 400, { ok: false, error: e.message }); }
  });
}

http.createServer(function (req, res) {
  const u = new URL(req.url, "http://localhost");
  const pn = u.pathname.replace(/\/+$/, "");
  if (!sameOrigin(req)) return json(res, 403, { ok: false, error: "仅允许本地同源访问" });

  if (req.method === "GET" && pn === "/editor-info") return json(res, 200, { app: "prototype-editor", build: BUILD_ID, notes: true });

  if (pn.endsWith("/ping")) { lastPing = Date.now(); res.writeHead(200); res.end("ok"); return; }
  if (pn.endsWith("/bye")) { res.writeHead(200); res.end("bye"); setTimeout(function () { process.exit(0); }, 100); return; }

  if (req.method === "POST" && pn === "/pick") {
    pickFolder(function (p) {
      var abs = p ? path.resolve(p) : ""; // 归一化去尾斜杠
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: !!abs, path: abs, name: abs ? path.basename(abs) : "" }));
    });
    return;
  }

  // 打开某个原型:/p/<base64url 路径>/*  —— 路径写在 URL 里,无全局状态,多标签互不干扰
  if (u.pathname.indexOf("/p/") === 0) {
    var rest = u.pathname.slice(3);
    var si = rest.indexOf("/");
    var token = si === -1 ? rest : rest.slice(0, si);
    var sub = si === -1 ? "" : rest.slice(si);
    var base;
    try { base = path.resolve(Buffer.from(decodeURIComponent(token).replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8")); }
    catch (e) { res.writeHead(400); res.end("bad token"); return; }
    var subClean = sub.replace(/\/+$/, "");
    if (req.method === 'GET' && subClean.endsWith('/notes-session')) {
      try {
        if (!noteSessions.has(base)) noteSessions.set(base, crypto.randomBytes(32).toString('hex'));
        lastPing = Date.now();
        return json(res, 200, { editable: true, token: noteSessions.get(base), revision: notesStore.read(base).revision });
      } catch (e) { return json(res, e.status || 400, { ok: false, error: e.message }); }
    }
    if (req.method === 'POST' && subClean.endsWith('/save-notes')) return saveToDir(req, res, base, true);
    if (req.method === "POST" && subClean.endsWith("/save-annotations")) { return saveToDir(req, res, base); }
    var rel = decodeURIComponent(sub);
    if (rel === "" || rel.endsWith("/")) rel += "index.html";
    var abs = path.normalize(path.join(base, rel));
    if (abs !== base && abs.indexOf(base + path.sep) !== 0) { res.writeHead(403); res.end("forbidden"); return; }
    return sendFile(abs, res);
  }

  // 默认:服务编辑器工具目录(/ → panel.html)
  let p = decodeURIComponent(u.pathname);
  if (p === "/" || p.endsWith("/")) p += "panel.html";
  const fp = path.normalize(path.join(ROOT, p));
  if (fp !== ROOT && fp.indexOf(ROOT + path.sep) !== 0) { res.writeHead(403); res.end("forbidden"); return; }
  sendFile(fp, res);
}).listen(PORT, "127.0.0.1", function () {
  console.log("原型编辑器服务:http://localhost:" + PORT + "/   (关掉控制页/编辑页即停)");
  var checkMs = Math.max(500, Math.min(3000, Math.floor(IDLE_MS / 2)));
  setInterval(function () {
    if (Date.now() - lastPing > IDLE_MS) { console.log("无页面心跳,自动停止。"); process.exit(0); }
  }, checkMs).unref();
});
