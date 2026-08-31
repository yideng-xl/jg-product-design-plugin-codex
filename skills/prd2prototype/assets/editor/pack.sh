#!/usr/bin/env bash
#
# pack.sh —— 把本目录的源文件组装成「原型编辑器.app」并打包成 dist/prototype-editor.zip
#
# 为什么源文件不直接以 .app 形式存在仓库里:
#   macOS 会索引磁盘上所有 .app,仓库里放一个,插件安装副本、克隆副本都会冒进
#   Launchpad / 启动台,变成一堆重复图标。所以仓库只存源文件,.app 只在打包产物里。
#
# 用法:bash skills/prd2prototype/assets/editor/pack.sh
# 产物:<仓库根>/dist/prototype-editor.zip (dist/ 已 gitignore,作 GitHub Release 附件)
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../../../.." && pwd)"
OUT="$ROOT/dist"
STAGE="$(mktemp -d)"
APP="$STAGE/原型编辑器.app"

mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
cp "$HERE/Info.plist" "$APP/Contents/Info.plist"
cp "$HERE/app-exec.sh" "$APP/Contents/MacOS/原型编辑器"
chmod +x "$APP/Contents/MacOS/原型编辑器"
cp "$HERE/serve.js" "$HERE/launcher.js" "$HERE/panel.html" "$HERE/AppIcon.icns" "$APP/Contents/Resources/"

cp "$HERE/原型编辑器.vbs" "$HERE/原型编辑器.command" "$HERE/使用说明.txt" "$STAGE/"
chmod +x "$STAGE/原型编辑器.command"

mkdir -p "$OUT"; rm -f "$OUT/prototype-editor.zip"
(cd "$STAGE" && zip -r -q "$OUT/prototype-editor.zip" 原型编辑器.app 原型编辑器.vbs 原型编辑器.command 使用说明.txt)
rm -rf "$STAGE"
echo "✅ 已打包:$OUT/prototype-editor.zip"
echo "   传到 GitHub Release:gh release upload <tag> dist/prototype-editor.zip"
