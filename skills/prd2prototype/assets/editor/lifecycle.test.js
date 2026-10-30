const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const { setTimeout: delay } = require('node:timers/promises');

test('无页面心跳超过旧超时仍可用，主动停止后退出', { timeout: 25000 }, async () => {
  const reserved = http.createServer();
  await new Promise(resolve => reserved.listen(0, '127.0.0.1', resolve));
  const port = reserved.address().port;
  await new Promise(resolve => reserved.close(resolve));
  const env = { ...process.env, PORT: String(port) };
  delete env.IDLE_MS;
  const child = spawn(process.execPath, [path.join(process.env.EDITOR_TEST_ROOT || __dirname, 'serve.js')], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  const exited = once(child, 'exit');
  try {
    await once(child.stdout, 'data');
    // No page, session, ping or HTTP traffic during this interval.
    await delay(18500);
    assert.equal(child.exitCode, null, '服务不能因页面无心跳而退出');
    const base = 'http://127.0.0.1:' + port;
    const info = await fetch(base + '/editor-info').then(r => r.json());
    assert.equal(info.app, 'prototype-editor');
    const response = await fetch(base + '/bye');
    assert.equal(response.status, 200);
    const [code] = await exited;
    assert.equal(code, 0);
  } finally {
    if (child.exitCode === null && child.signalCode === null) child.kill();
    await exited;
  }
});
