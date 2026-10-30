const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { once } = require('node:events');
const { ensureServer, probe } = require('./launcher');

test('旧服务占用时另选端口，相同版本再次启动时复用', async () => {
  const old = http.createServer((req, res) => { res.writeHead(404); res.end('not found'); });
  await new Promise(resolve => old.listen(0, '127.0.0.1', resolve));
  const port = old.address().port;
  let child;
  try {
    assert.equal(await probe(port), 'occupied');
    const fresh = await ensureServer(port);
    child = fresh.child;
    assert.ok(fresh.port > port);
    assert.ok(child);
    assert.equal(await probe(fresh.port), 'compatible');
    const again = await ensureServer(port);
    assert.equal(again.port, fresh.port);
    assert.equal(again.child, undefined);
    assert.ok(old.listening);
  } finally {
    if (child) { const stopped = once(child, 'exit'); child.kill(); await stopped; }
    await new Promise(resolve => old.close(resolve));
  }
});
