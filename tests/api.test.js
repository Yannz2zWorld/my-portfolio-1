'use strict';
// The API against a fake GitHub contents API: password, same-origin, saving as a commit.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

let github, app, base, commits = [];
let file = null;   // { content (base64), sha }

before(async () => {
  github = http.createServer((req, res) => {
    let raw = '';
    req.on('data', c => { raw += c; });
    req.on('end', () => {
      res.setHeader('content-type', 'application/json');
      if (req.headers.authorization !== 'Bearer test-token') { res.statusCode = 401; return res.end('{"message":"Bad credentials"}'); }
      if (!req.url.startsWith('/repos/me/site/contents/data/portfolio.json')) { res.statusCode = 404; return res.end('{}'); }
      if (req.method === 'GET') { if (!file) { res.statusCode = 404; return res.end('{}'); } return res.end(JSON.stringify(file)); }
      const body = JSON.parse(raw);
      if (file && body.sha !== file.sha) { res.statusCode = 409; return res.end('{"message":"sha mismatch"}'); }
      commits.push(body);
      file = { content: body.content, sha: 'sha' + commits.length };
      res.statusCode = file.sha === 'sha1' ? 201 : 200;
      res.end(JSON.stringify({ content: {}, commit: { sha: 'c' + commits.length, committer: { date: '2026-10-23T10:00:00Z' } } }));
    });
  });
  await new Promise(r => github.listen(0, '127.0.0.1', r));
  Object.assign(process.env, { PANEL_PASSWORD: 'rahasia-panel', GITHUB_TOKEN: 'test-token', GITHUB_REPO: 'me/site', GITHUB_API_URL: `http://127.0.0.1:${github.address().port}` });
  app = require('../scripts/dev').createServer();
  await new Promise(r => app.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${app.address().port}`;
});
after(() => { app?.close(); github?.close(); });

const call = (method, url, { body, password, origin } = {}) => fetch(base + url, {
  method,
  headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(password ? { 'x-panel-password': password } : {}), ...(origin ? { origin } : {}) },
  body: body ? JSON.stringify(body) : undefined,
}).then(async r => ({ status: r.status, json: await r.json().catch(() => null) }));

test('GET falls back to the deployed file until something is saved', async () => {
  const r = await call('GET', '/api/portfolio');
  assert.equal(r.status, 200);
  assert.equal(r.json.source, 'deployed');
  assert.equal(r.json.storage, true);
  assert.ok(r.json.platforms.includes('tiktok'));
});

test('password and origin are required to save', async () => {
  const profile = { name: 'Yannz', username: 'yannz' };
  assert.equal((await call('PUT', '/api/portfolio', { body: { profile } })).status, 401);
  assert.equal((await call('PUT', '/api/portfolio', { body: { profile }, password: 'salah-banget' })).json.error, 'WRONG_PASSWORD');
  assert.equal((await call('PUT', '/api/portfolio', { body: { profile }, password: 'rahasia-panel', origin: 'https://evil.example' })).status, 403);
  assert.equal((await call('POST', '/api/auth', { password: 'salah-banget' })).status, 401);
  assert.equal((await call('POST', '/api/auth', { password: 'rahasia-panel' })).status, 200);
  assert.equal(commits.length, 0);
});

test('a save is sanitized, committed, and read back fresh', async () => {
  const r = await call('PUT', '/api/portfolio', { password: 'rahasia-panel', origin: base, body: { profile: { name: 'Yannz', username: '@yannz', stories: [{ type: 'text', text: 'Halo', bg: 'pink' }], hack: 1 } } });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  assert.equal(r.json.savedAt, '2026-10-23T10:00:00Z');
  assert.equal(commits.length, 1);
  const stored = JSON.parse(Buffer.from(commits[0].content, 'base64').toString());
  assert.equal(stored.username, 'yannz');
  assert.equal('hack' in stored, false);
  assert.equal(commits[0].branch, 'main');
  assert.match(commits[0].message, /Diriku Panel/);

  const again = await call('GET', '/api/portfolio');
  assert.equal(again.json.source, 'github');
  assert.deepEqual(again.json.profile.stories, [{ type: 'text', text: 'Halo', bg: 'pink' }]);

  // second save updates the same file (sends its sha); invalid input is refused without a commit
  assert.equal((await call('PUT', '/api/portfolio', { password: 'rahasia-panel', body: { profile: { ...stored, name: 'Yannz Dev' } } })).status, 200);
  assert.equal(commits[1].sha, 'sha1');
  const bad = await call('PUT', '/api/portfolio', { password: 'rahasia-panel', body: { profile: { ...stored, website: 'javascript:alert(1)' } } });
  assert.equal(bad.status, 400);
  assert.equal(bad.json.field, 'website');
  assert.equal(commits.length, 2);

  // reset writes the built-in example
  const reset = await call('DELETE', '/api/portfolio', { password: 'rahasia-panel' });
  assert.equal(reset.status, 200);
  assert.equal(reset.json.profile.username, 'yannz2zworld');
});

test('without PANEL_PASSWORD the panel stays locked', async () => {
  const saved = process.env.PANEL_PASSWORD;
  delete process.env.PANEL_PASSWORD;
  try {
    assert.equal((await call('POST', '/api/auth', { password: 'anything' })).json.error, 'PANEL_NOT_CONFIGURED');
  } finally { process.env.PANEL_PASSWORD = saved; }
});

test('static pages are served', async () => {
  for (const url of ['/', '/panel', '/data/portfolio.json']) {
    const r = await fetch(base + url);
    assert.equal(r.status, 200, url);
  }
});
