#!/bin/bash
# Mac 兜底入口(当 原型编辑器.app 因 PATH 找不到 node 时用它;会走登录 shell 的完整 PATH)。
# 与 原型编辑器.app 放同一目录。
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "未检测到 node,请先安装 Node.js(https://nodejs.org)。"
  read -n 1 -s -r -p "按任意键关闭…"; exit 1
fi
exec node "原型编辑器.app/Contents/Resources/launcher.js"
