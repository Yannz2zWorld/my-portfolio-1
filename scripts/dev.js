'use strict';
// Local preview: serves the static files and runs api/*.js the way Vercel does.
//   PANEL_PASSWORD=rahasia123 node scripts/dev.js   → http://localhost:3000
// Without GITHUB_TOKEN the panel can be opened but saving says storage is not configured.
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.mp4': 'video/mp4', '.webm': 'video/webm' };

function withHelpers(res) {
  res.status = code => { res.statusCode = code; return res; };
  res.json = body => { if (!res.getHeader('content-type')) res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(body)); return res; };
  return res;
}

function readBody(req) {
  return new Promise(resolve => {
    let raw = '';
    req.on('data', c => { raw += c; if (raw.length > 1e6) req.destroy(); });
    req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : undefined); } catch { resolve(undefined); } });
  });
}

function createServer() {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const api = url.pathname.match(/^\/api\/([\w-]+)$/);
    if (api) {
      const file = path.join(ROOT, 'api', api[1] + '.js');
      if (!fs.existsSync(file)) { res.statusCode = 404; return res.end('Not found'); }
      req.body = await readBody(req);
      req.query = Object.fromEntries(url.searchParams);
      return require(file)(req, withHelpers(res));
    }
    let rel = decodeURIComponent(url.pathname);
    if (rel.endsWith('/')) rel += 'index.html';
    let file = path.join(ROOT, rel);
    if (!file.startsWith(ROOT + path.sep)) { res.statusCode = 403; return res.end(); }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    else if (!fs.existsSync(file) && fs.existsSync(file + '.html')) file += '.html';
    if (!fs.existsSync(file)) { res.statusCode = 404; return res.end('Not found'); }
    res.setHeader('content-type', TYPES[path.extname(file)] || 'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  createServer().listen(port, () => console.log(`Portfolio: http://localhost:${port}   Diriku Panel: http://localhost:${port}/panel`));
}
module.exports = { createServer };
