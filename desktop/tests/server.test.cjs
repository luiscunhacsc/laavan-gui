const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const {startServer} = require('../server.cjs');

test('desktop server serves only bundled assets on loopback with browser/WASM MIME types', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'Forma desktop test '));
  const assets = {'index.html':'<title>Forma</title>', 'engine.mjs':'export const ready = true', 'engine.wasm':'wasm', 'font.ttf':'font'};
  for (const [name, content] of Object.entries(assets)) await fs.writeFile(path.join(root, name), content);
  await fs.writeFile(path.join(root, 'private.txt'), 'not a public asset');
  await fs.writeFile(path.join(root, 'assets-manifest.json'), JSON.stringify({files:Object.keys(assets).map(path => ({path}))}));
  const {server, origin} = await startServer(root, 0);
  t.after(async () => { await new Promise(resolve => server.close(resolve)); await fs.rm(root, {recursive:true, force:true}); });
  assert.equal(server.address().address, '127.0.0.1');
  for (const [name, type] of [['', 'text/html'], ['engine.mjs', 'text/javascript'], ['engine.wasm', 'application/wasm'], ['font.ttf', 'font/ttf']]) {
    const response = await fetch(origin + '/' + name);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), new RegExp(type));
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(await response.text(), assets[name || 'index.html']);
  }
  const head = await fetch(origin + '/', {method:'HEAD'});
  assert.equal(head.status, 200); assert.equal(await head.text(), '');
  assert.equal((await fetch(origin + '/', {method:'POST', body:'data'})).status, 405);
  const request = (target, host) => new Promise((resolve, reject) => {
    http.get(origin + '/', {path:target, headers:host ? {Host:host} : {}}, response => {
      response.resume(); response.on('end', () => resolve(response.statusCode));
    }).on('error', reject);
  });
  for (const name of ['/private.txt', '/../package.json', '/%2e%2e/package.json', '/%5c..%5cpackage.json', '/engine.wasm/extra', '/__qa', '/%00']) assert.equal(await request(name), 404, name);
  assert.equal(await request('/%zz'), 400);
  assert.equal(await request('/', 'evil.example'), 403);
});
