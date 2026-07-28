#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const target = process.argv[2];
if (!target) {
  console.error("用法: node scripts/check-prototype-editable.mjs <原型目录>");
  process.exit(2);
}

const root = path.resolve(target);
if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
  console.error(`原型目录不存在: ${root}`);
  process.exit(2);
}

function walk(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (entry.isFile() && entry.name.endsWith(".html")) files.push(full);
  }
  return files;
}

function lineOf(text, index) {
  return text.slice(0, index).split("\n").length;
}

const problems = [];
const annoFile = path.join(root, "data", "annotations.js");
if (!fs.existsSync(annoFile)) {
  problems.push("缺少 data/annotations.js");
} else if (!fs.readFileSync(annoFile, "utf8").includes("window.__ANNO__")) {
  problems.push("data/annotations.js 未定义 window.__ANNO__");
}

const ids = new Map();
const htmlFiles = walk(root);
let wiredPages = 0;

for (const file of htmlFiles) {
  const rel = path.relative(root, file);
  const html = fs.readFileSync(file, "utf8");
  const commonMatch = /<script\b[^>]*\bsrc=["'][^"']*common\.js(?:\?[^"']*)?["'][^>]*>/i.exec(html);

  if (commonMatch) {
    wiredPages += 1;
    const annoMatch = /<script\b[^>]*\bsrc=["'][^"']*data\/annotations\.js(?:\?[^"']*)?["'][^>]*>/i.exec(html);
    if (!annoMatch) {
      problems.push(`${rel}: 引用了 common.js，但未引用 data/annotations.js`);
    } else if (annoMatch.index > commonMatch.index) {
      problems.push(`${rel}: data/annotations.js 必须在 common.js 之前引用`);
    }
  }

  for (const match of html.matchAll(/<[^>]*\bdata-anno-id=["']([^"']+)["'][^>]*>/gi)) {
    const id = match[1];
    const position = `${rel}:${lineOf(html, match.index)}`;
    if (ids.has(id)) problems.push(`${position}: data-anno-id "${id}" 与 ${ids.get(id)} 重复`);
    else ids.set(id, position);
  }

  for (const match of html.matchAll(/<[^>]*\bdata-anno-rich(?:=["'][^"']*["'])?[^>]*>/gi)) {
    if (!/\bdata-anno-id=["'][^"']+["']/i.test(match[0])) {
      problems.push(`${rel}:${lineOf(html, match.index)}: data-anno-rich 必须与 data-anno-id 同时使用`);
    }
  }

  for (const match of html.matchAll(/<[^>]*\bclass=["'][^"']*\bpt-pop-item\b[^"']*["'][^>]*>/gi)) {
    if (!/\bdata-anno-id=["'][^"']+["']/i.test(match[0])) {
      problems.push(`${rel}:${lineOf(html, match.index)}: 需求便签 pt-pop-item 缺少 data-anno-id`);
    }
  }

  if (/\bclass=["'][^"']*\bproto-note\b/i.test(html) && !/\bdata-anno-id=["'][^"']+["']/i.test(html)) {
    problems.push(`${rel}: 存在原型说明，但页面没有任何 data-anno-id`);
  }
}

if (wiredPages === 0) problems.push("未找到引用 common.js 的 HTML 页面");

if (problems.length) {
  console.error("原型可编辑接入检查失败:");
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log(`原型可编辑接入检查通过: ${wiredPages} 个页面，${ids.size} 个可编辑标识`);
