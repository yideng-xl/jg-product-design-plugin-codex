/* =============================================================================
   launcher.js —— 原型编辑器启动器(跨平台)
   -----------------------------------------------------------------------------
   由 原型编辑器.app(Mac)/ .vbs(Win)/ .command / .cmd 双击拉起。
   固定端口 47821(可收藏 http://localhost:47821/):
     · 如果服务已在跑 → 直接打开默认浏览器到控制页,不重复启动。
     · 没在跑 → 起 serve.js,再打开浏览器。
   控制页(panel.html)= 壳:操作说明 + 选原型 + 使用说明 + 停止。关掉页面服务自动停。
   ============================================================================= */
const { spawn } = require("child_process");
const net = require("net");
const path = require("path");

const PORT = 47821;
const URL = "http://localhost:" + PORT + "/";

function probe(cb) {
  const s = net.connect({ host: "127.0.0.1", port: PORT });
  let done = false;
  s.on("connect", function () { done = true; s.destroy(); cb(true); });
  s.on("error", function () { if (!done) { done = true; cb(false); } });
  setTimeout(function () { if (!done) { done = true; s.destroy(); cb(false); } }, 600);
}

function openBrowser(url) {
  const c = process.platform === "darwin" ? ["open", [url]]
    : process.platform === "win32" ? ["cmd", ["/c", "start", "", url]]
    : ["xdg-open", [url]];
  try { spawn(c[0], c[1], { stdio: "ignore", detached: true }).unref(); } catch (e) {}
}

probe(function (up) {
  if (up) { openBrowser(URL); process.exit(0); return; } // 已在运行,直接开
  const child = spawn(process.execPath, [path.join(__dirname, "serve.js")], {
    stdio: "ignore", env: Object.assign({}, process.env, { PORT: String(PORT) })
  });
  setTimeout(function () { openBrowser(URL); }, 800);
  child.on("exit", function () { process.exit(0); });
});
