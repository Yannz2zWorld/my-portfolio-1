'use strict';
// POST: checks the Diriku Panel password, so the panel can say "wrong password" before any edit.
const auth = require('../lib/auth');
const github = require('../lib/github');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ success: false, error: 'METHOD_NOT_ALLOWED', message: 'Metode tidak didukung.' }); }
  if (!auth.sameOrigin(req)) return res.status(403).json({ success: false, error: 'CSRF_BLOCKED', message: 'Permintaan dari website lain ditolak.' });
  const denied = await auth.check(req);
  if (denied) return res.status(denied[0]).json({ success: false, error: denied[1], message: denied[2] });
  return res.status(200).json({ success: true, storage: github.configured() });
};
