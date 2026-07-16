#!/bin/bash
# 原型编辑器.app 入口(双击不弹终端)。所有文件在 Contents/Resources 内,自包含。
RES="$(cd "$(dirname "$0")/../Resources" && pwd)"
cd "$RES" || exit 1
# GUI 应用启动 PATH 很窄,补常见 node 位置 + 尝试 nvm
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"
[ -s "$HOME/.nvm/nvm.sh" ] && . "$HOME/.nvm/nvm.sh" >/dev/null 2>&1
if ! command -v node >/dev/null 2>&1; then
  osascript -e 'display alert "未检测到 Node.js" message "请先安装 Node.js(https://nodejs.org)后重试。" as critical' >/dev/null 2>&1
  exit 1
fi
exec node launcher.js
