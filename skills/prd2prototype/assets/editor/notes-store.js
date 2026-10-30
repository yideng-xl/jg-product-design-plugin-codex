/* 本地说明覆盖层：保留未知字段，按页面合并，原子保存。 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');
const own = (v, k) => Object.prototype.hasOwnProperty.call(v, k);
const object = v => v && typeof v === 'object' && !Array.isArray(v);
function fail(message, status = 400) { const e = new Error(message); e.status = status; throw e; }
function validKey(k) { return typeof k === 'string' && k.length > 0 && k.length <= 500 && !['__proto__', 'constructor', 'prototype'].includes(k); }
function normalize(value) {
  if (!object(value)) fail('说明文件必须包含对象');
  if (!['overrides','additions','removed','notes'].some(k => own(value, k))) return { overrides: value, additions: {}, removed: [] };
  return value;
}
function read(dir) {
  const file = path.join(dir, 'data', 'annotations.js');
  const source = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  if (Buffer.byteLength(source) > 5e6) fail('说明文件超过大小限制');
  let value = {};
  if (source.trim()) {
    const context = vm.createContext(Object.create(null), { codeGeneration: { strings: false, wasm: false } });
    // 在独立上下文中创建 window，禁止访问主进程对象；序列化也在超时范围内执行。
    value = JSON.parse(vm.runInContext('var window = Object.create(null);\n' + source + '\nJSON.stringify(window.__ANNO__ || {})', context, { timeout: 100 }));
  }
  return { file, value: normalize(value), revision: crypto.createHash('sha256').update(source).digest('hex') };
}
function validateOverrides(overrides) {
  if (!object(overrides)) fail('overrides 必须是对象');
  for (const [id, text] of Object.entries(overrides)) if (!validKey(id) || typeof text !== 'string' || text.length > 200000) fail('说明内容格式无效');
}
function validateNotes(notes) {
  if (!Array.isArray(notes) || notes.length > 1000) fail('notes 必须是说明数组，最多 1000 条');
  const ids = new Set();
  for (const note of notes) {
    if (!object(note) || !validKey(note.id) || ids.has(note.id)) fail('说明 ID 无效或重复');
    ids.add(note.id);
    for (const field of ['title', 'body']) if (own(note, field) && (typeof note[field] !== 'string' || note[field].length > 200000)) fail('说明标题或正文格式无效');
    if (own(note, 'target') && !object(note.target)) fail('说明目标格式无效');
    if (JSON.stringify(note).length > 500000) fail('单条说明超过大小限制');
  }
}
function write(snapshot, value) {
  const output = '/* 原型手改覆盖层：生成或更新原型时请保留本文件。 */\nwindow.__ANNO__ = ' + JSON.stringify(value, null, 2) + ';\n';
  if (Buffer.byteLength(output) > 5e6) fail('说明文件超过大小限制');
  fs.mkdirSync(path.dirname(snapshot.file), { recursive: true });
  const temp = snapshot.file + '.' + crypto.randomBytes(8).toString('hex') + '.tmp';
  try { fs.writeFileSync(temp, output, { flag: 'wx' }); fs.renameSync(temp, snapshot.file); }
  finally { if (fs.existsSync(temp)) fs.unlinkSync(temp); }
  return { ok: true, revision: crypto.createHash('sha256').update(output).digest('hex') };
}
function save(dir, data) {
  if (!object(data) || !validKey(data.pageKey)) fail('pageKey 无效');
  validateOverrides(data.overrides); validateNotes(data.notes);
  const snapshot = read(dir);
  if (data.revision !== snapshot.revision) fail('说明已被其他页面修改，请刷新后重试', 409);
  const current = snapshot.value;
  const notes = { ...(object(current.notes) ? current.notes : {}), [data.pageKey]: data.notes };
  const allIds = new Set();
  for (const rows of Object.values(notes)) {
    if (!Array.isArray(rows)) continue;
    for (const row of rows) { if (!object(row) || !row.id) continue; if (allIds.has(row.id)) fail('说明 ID 与其他页面重复'); allIds.add(row.id); }
  }
  return write(snapshot, { ...current, overrides: { ...(current.overrides || {}), ...data.overrides }, notes });
}
function saveLegacy(dir, data) {
  const incoming = normalize(data);
  validateOverrides(incoming.overrides || {});
  const snapshot = read(dir); const current = snapshot.value;
  const removed = [...new Set([...(Array.isArray(current.removed) ? current.removed : []), ...(Array.isArray(incoming.removed) ? incoming.removed : [])])];
  if (removed.some(id => !validKey(id))) fail('删除说明 ID 无效');
  const additions = { ...(current.additions || {}) };
  for (const [container, rows] of Object.entries(incoming.additions || {})) {
    if (!validKey(container) || !Array.isArray(rows)) fail('新增说明格式无效');
    const merged = new Map((additions[container] || []).map(row => [row.id, row]));
    for (const row of rows) { if (!object(row) || !validKey(row.id) || typeof row.text !== 'string') fail('新增说明格式无效'); merged.set(row.id, row); }
    additions[container] = [...merged.values()];
  }
  for (const key of Object.keys(additions)) additions[key] = additions[key].filter(row => !removed.includes(row.id));
  return write(snapshot, { ...current, overrides: { ...(current.overrides || {}), ...(incoming.overrides || {}) }, additions, removed });
}
module.exports = { read, save, saveLegacy };
