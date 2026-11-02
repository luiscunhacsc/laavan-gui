'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const {pipeline} = require('node:stream');

const MIME = {'.html':'text/html; charset=utf-8', '.js':'text/javascript', '.mjs':'text/javascript',
  '.css':'text/css', '.json':'application/json', '.webmanifest':'application/manifest+json',
  '.wasm':'application/wasm', '.png':'image/png', '.svg':'image/svg+xml', '.ico':'image/x-icon',
  '.ttf':'font/ttf', '.otf':'font/otf', '.woff':'font/woff', '.woff2':'font/woff2'};

async function startServer(root, port = 18765) {
  root = path.resolve(root);
  const manifest = JSON.parse(await fs.promises.readFile(path.join(root, 'assets-manifest.json'), 'utf8'));
  const allowed = new Set([...manifest.files.map(file => file.path), 'assets-manifest.json', 'release.json', 'sw.js']);
  const server = http.createServer(async (request, response) => {
    const reply = (status, message) => { response.writeHead(status, {'Content-Type':'text/plain'}); response.end(message); };
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    const expectedHost = `127.0.0.1:${server.address().port}`;
    if (request.headers.host !== expectedHost) return reply(403, 'Local requests only');
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.setHeader('Allow', 'GET, HEAD');
      return reply(405, 'Method not allowed');
    }
    let name;
    try {
      const raw = decodeURIComponent((request.url || '').split('?')[0]);
      if (!raw.startsWith('/') || raw.includes('\\') || raw.includes('\0') || raw.split('/').includes('..')) return reply(404, 'Not found');
      name = raw === '/' ? 'index.html' : raw.slice(1);
    } catch { return reply(400, 'Invalid path'); }
    if (!allowed.has(name)) return reply(404, 'Not found');
    try {
      const file = path.join(root, name);
      const stat = await fs.promises.stat(file);
      if (!stat.isFile()) return reply(404, 'Not found');
      response.writeHead(200, {'Content-Type':MIME[path.extname(name)] || 'application/octet-stream', 'Content-Length':stat.size});
      if (request.method === 'HEAD') return response.end();
      pipeline(fs.createReadStream(file), response, () => {});
    } catch { if (!response.headersSent) reply(404, 'Not found'); else response.destroy(); }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => { server.removeListener('error', reject); resolve(); });
  });
  return {server, origin:`http://127.0.0.1:${server.address().port}`};
}
module.exports = {startServer};
