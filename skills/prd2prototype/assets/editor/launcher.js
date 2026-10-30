/* 原型编辑器启动器：只复用相同构建的服务，旧服务占用时另选端口。 */
const { spawn } = require("child_process");
const net = require("net");
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const BUILD_ID = crypto.createHash("sha256").update(
  ["launcher.js", "serve.js", "notes-store.js", "panel.html"].map(name => fs.readFileSync(path.join(__dirname, name))).map(b => b.toString()).join("\0")
).digest("hex");

function probe(port) {
  return new Promise(resolve => {
    const socket = net.connect({ host: "127.0.0.1", port });
    let settled = false;
    function finish(value) { if (!settled) { settled = true; socket.destroy(); resolve(value); } }
    socket.setTimeout(600, () => finish("occupied"));
    socket.on("error", error => finish(error.code === "ECONNREFUSED" ? "free" : "occupied"));
    socket.on("connect", () => {
      socket.destroy();
      const request = http.get({ hostname: "127.0.0.1", port, path: "/editor-info", timeout: 600 }, response => {
        let data = "";
        response.on("data", chunk => { data += chunk; if (data.length > 4096) request.destroy(); });
        response.on("end", () => {
          try {
            const info = JSON.parse(data);
            finish(response.statusCode === 200 && info.app === "prototype-editor" && info.build === BUILD_ID ? "compatible" : "occupied");
          } catch { finish("occupied"); }
        });
      });
      request.on("timeout", () => request.destroy());
      request.on("error", () => finish("occupied"));
    });
  });
}

async function ensureServer(startPort = 47821) {
  for (let port = startPort; port < startPort + 20; port++) {
    const state = await probe(port);
    const url = "http://127.0.0.1:" + port + "/";
    if (state === "compatible") return { url, port };
    if (state !== "free") continue;
    const child = spawn(process.execPath, [path.join(__dirname, "serve.js")], {
      stdio: "ignore", env: Object.assign({}, process.env, { PORT: String(port) })
    });
    let failed = false;
    child.on("error", () => { failed = true; });
    child.on("exit", () => { failed = true; });
    for (let attempt = 0; attempt < 40 && !failed; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (await probe(port) === "compatible") return { url, port, child };
    }
    if (!failed) child.kill();
  }
  throw new Error("原型编辑器启动失败，请关闭不用的编辑器后重试。");
}

function openBrowser(url) {
  const command = process.platform === "darwin" ? ["open", [url]]
    : process.platform === "win32" ? ["cmd", ["/c", "start", "", url]]
    : ["xdg-open", [url]];
  spawn(command[0], command[1], { stdio: "ignore", detached: true }).unref();
}
if (require.main === module) {
  ensureServer().then(({ url }) => openBrowser(url)).catch(error => { console.error(error.message); process.exitCode = 1; });
}
module.exports = { BUILD_ID, probe, ensureServer };
