'use strict';
// Diriku Panel is locked with one password, PANEL_PASSWORD (set in Vercel → Settings →
// Environment Variables). The panel sends it in the x-panel-password header with each change.
const crypto = require('crypto');

const digest = v => crypto.createHash('sha256').update(String(v)).digest();
const wait = ms => new Promise(r => setTimeout(r, ms));

// null when allowed, else [status, error, message].
async function check(req) {
  const secret = process.env.PANEL_PASSWORD || '';
  if (secret.length < 8) return [503, 'PANEL_NOT_CONFIGURED', 'PANEL_PASSWORD belum diatur (minimal 8 karakter) di Environment Variables Vercel.'];
  const given = String(req.headers['x-panel-password'] || '');
  if (given && crypto.timingSafeEqual(digest(given), digest(secret))) return null;
  await wait(800);   // slows down password guessing
  return [401, 'WRONG_PASSWORD', 'Password salah.'];
}

// State-changing requests must come from this site's own pages.
function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try { return new URL(origin).host === req.headers.host; } catch { return false; }
}

module.exports = { check, sameOrigin };
