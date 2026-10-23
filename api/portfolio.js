'use strict';
// GET    the current document (public; fresh from GitHub when configured, else the deployed file)
// PUT    { profile } → sanitize and commit (password)
// DELETE back to the built-in example (password)
const fs = require('fs');
const path = require('path');
const portfolio = require('../lib/portfolio');
const github = require('../lib/github');
const auth = require('../lib/auth');

const fail = (res, status, error, message, extra = {}) => res.status(status).json({ success: false, error, message, ...extra });
const meta = { platforms: portfolio.PLATFORMS, ratios: portfolio.RATIOS, storyStyles: portfolio.STORY_STYLES, storyBgs: portfolio.STORY_BGS };

function deployed() {
  try { return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'portfolio.json'), 'utf8')); } catch { return null; }
}

async function current() {
  if (github.configured()) {
    const r = await github.read();
    if (r) return { profile: r.profile, source: 'github' };
  }
  const d = deployed();
  return { profile: d || portfolio.DEFAULT, source: d ? 'deployed' : 'default' };
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method === 'GET') {
      const { profile, source } = await current();
      let clean;
      try { clean = portfolio.sanitize(profile); } catch { clean = portfolio.DEFAULT; }
      return res.status(200).json({ success: true, profile: clean, source, storage: github.configured(), ...meta });
    }
    if (req.method !== 'PUT' && req.method !== 'DELETE') {
      res.setHeader('Allow', 'GET, PUT, DELETE');
      return fail(res, 405, 'METHOD_NOT_ALLOWED', 'Metode tidak didukung.');
    }
    if (!auth.sameOrigin(req)) return fail(res, 403, 'CSRF_BLOCKED', 'Permintaan dari website lain ditolak.');
    const denied = await auth.check(req);
    if (denied) return fail(res, ...denied);
    if (!github.configured()) return fail(res, 503, 'STORAGE_NOT_CONFIGURED', 'GITHUB_TOKEN belum diatur di Environment Variables Vercel, jadi perubahan belum bisa disimpan.');

    const profile = req.method === 'DELETE' ? portfolio.sanitize(portfolio.DEFAULT) : portfolio.sanitize(req.body?.profile);
    const saved = await github.write(profile, req.method === 'DELETE' ? 'Reset portfolio ke contoh bawaan (Diriku Panel)' : 'Update portfolio (Diriku Panel)');
    return res.status(200).json({ success: true, profile, source: 'github', storage: true, savedAt: saved.at, commit: saved.commit, ...meta });
  } catch (e) {
    if (e.code === 'INVALID_PORTFOLIO') return fail(res, 400, e.code, e.message, { field: e.field });
    if (e.code === 'GITHUB_ERROR') return fail(res, 502, e.code, e.message);
    console.error('portfolio api failed:', e?.message);
    return fail(res, 500, 'SERVER_ERROR', 'Terjadi kesalahan di server.');
  }
};
