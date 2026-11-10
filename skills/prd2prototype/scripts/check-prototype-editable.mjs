#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const {read: readAnnotations} = createRequire(import.meta.url)("../assets/editor/notes-store.js");

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
let annotation = {};
try { annotation = readAnnotations(root).value; } catch (error) { problems.push('说明覆盖层无法读取：' + error.message); }
const numbering = annotation.noteNumbering;
const numbered = numbering != null;
if (numbered && (!Number.isSafeInteger(numbering.rightMax) || numbering.rightMax < 0 || !Number.isSafeInteger(numbering.wideMax) || numbering.wideMax < 0)) problems.push('说明编号上限无效');
const codes = new Map();
function registerCode(code, prefix, position, generated = false) {
  const n = typeof code === 'string' && code.startsWith(prefix) ? Number(code.slice(prefix.length)) : 0;
  if (!Number.isSafeInteger(n) || n < 1 || code !== prefix + String(n).padStart(prefix === 'R-' ? 3 : 2, '0')) {
    problems.push(position + ': 说明编号无效，应使用 ' + (prefix === 'R-' ? 'R-001' : 'WR-01'));
    return;
  }
  if (codes.has(code)) problems.push(position + ': 说明编号 ' + code + ' 与 ' + codes.get(code) + ' 重复');
  else codes.set(code, position);
  if (generated && numbered && n > numbering[prefix === 'R-' ? 'rightMax' : 'wideMax']) problems.push(position + ': 说明编号超过已登记的上限');
}
if (numbered) for (const [pageKey, notes] of Object.entries(annotation.notes || {})) {
  if (Array.isArray(notes)) for (const note of notes) registerCode(note.code, 'R-', 'annotations.js/' + pageKey + '/' + note.id);
}
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

  if (/<body\b[^>]*\bdata-prototype-notes(?:[\s=>])/i.test(html)) {
    const order = ['data/annotations.js', 'prototype-mark.js', 'prototype-notes.js'].map(name => html.indexOf(name));
    if (order.some(n => n < 0) || order[0] > order[1] || order[1] > order[2]) problems.push(`${rel}: 新说明布局加载顺序应为 annotations.js、prototype-mark.js、prototype-notes.js`);
    if (!html.includes('prototype-notes.css')) problems.push(`${rel}: 新说明布局缺少 prototype-notes.css`);
    if (!/<body\b[^>]*\bdata-page=["'][^"']+["']/i.test(html)) problems.push(`${rel}: 新说明布局缺少稳定 data-page`);
    for (const match of html.matchAll(/<[^>]*\bdata-note-target=["'][^"']*["'][^>]*>/gi)) {
      if (!/\bdata-anno-id=["'][^"']+["']/i.test(match[0])) problems.push(`${rel}: 局部说明 data-note-target 必须同时具有稳定 data-anno-id`);
    }
    for (const asset of ['prototype-notes.css','prototype-mark.js','prototype-notes.js']) {
      if (!fs.existsSync(path.join(root,'assets',asset))) problems.push(`${rel}: 缺少 assets/${asset}`);
    }
  }

  const hasNotesLayout = /<body\b[^>]*\bdata-prototype-notes(?:[\s=>])/i.test(html);
  for (const match of html.matchAll(/<[^>]*\b(?:data-anno-id|data-note-code)=["'][^"']*["'][^>]*>/gi)) {
    const tag = match[0];
    const code = /\bdata-note-code=["']([^"']*)["']/i.exec(tag)?.[1];
    const right = /\bdata-note-target=/i.test(tag);
    if (code !== undefined || numbered && hasNotesLayout) registerCode(code, right ? 'R-' : 'WR-', rel + ':' + lineOf(html, match.index), true);
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
