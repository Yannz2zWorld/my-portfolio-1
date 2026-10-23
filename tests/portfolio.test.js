'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { sanitize, DEFAULT } = require('../lib/portfolio');
const fs = require('fs');
const path = require('path');

const base = { name: 'Yannz', username: '@yannz' };

test('the built-in example and the shipped data file are valid documents', () => {
  assert.equal(sanitize(DEFAULT).name, DEFAULT.name);
  const file = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'portfolio.json'), 'utf8'));
  assert.deepEqual(sanitize(file), file);
});

test('keeps known fields and drops empty items', () => {
  const p = sanitize({
    ...base, storyStyle: 'view', bannerRatio: '4 / 3',
    stories: [{ media: 'https://cdn.example/s.jpg', caption: 'Baru' }, { media: '' }, { type: 'text', text: 'Halo', bg: 'blue' }, { type: 'text', text: ' ' }, { type: 'text', text: 'Hai', bg: 'neon' }],
    highlights: [{ title: 'Trip', items: [{ media: '/a.mp4' }] }, { title: '', items: [] }],
    projects: [{ title: 'API', media: 'https://youtu.be/dQw4w9WgXcQ', tags: ['Node', ''] }, { title: '' }],
    skills: ['JS', ''],
    socials: [{ platform: 'whatsapp', url: '+62 812-3456-7890' }, { platform: 'myspace', url: 'https://x.test' }, { platform: 'github', url: 'https://github.com/y' }],
    extra: 'dropped',
  });
  assert.equal(p.username, 'yannz');
  assert.equal(p.storyStyle, 'view');
  assert.deepEqual(p.stories, [
    { type: 'media', media: 'https://cdn.example/s.jpg', caption: 'Baru' },
    { type: 'text', text: 'Halo', bg: 'blue' },
    { type: 'text', text: 'Hai', bg: 'dark' },
  ]);
  assert.equal(p.highlights.length, 1);
  assert.deepEqual(p.projects.map(x => x.tags), [['Node']]);
  assert.deepEqual(p.skills, ['JS']);
  assert.deepEqual(p.socials, [{ platform: 'whatsapp', url: 'https://wa.me/6281234567890' }, { platform: 'github', url: 'https://github.com/y' }]);
  assert.equal('extra' in p, false);
  assert.equal(sanitize({ ...base, storyStyle: 'popup' }).storyStyle, 'overlay');
});

test('refuses script links and other junk', () => {
  for (const bad of ['javascript:alert(1)', '//evil.example/x.jpg', 'data:text/html,hi', 'evil.example/x.jpg']) {
    assert.throws(() => sanitize({ ...base, projects: [{ title: 'x', media: bad }] }), { code: 'INVALID_PORTFOLIO' }, bad);
  }
  assert.throws(() => sanitize({ ...base, username: 'a b' }), { field: 'username' });
  assert.throws(() => sanitize({ ...base, name: ' ' }), { field: 'name' });
  assert.throws(() => sanitize({ ...base, contact: { email: 'nope' } }), { field: 'contact.email' });
});
