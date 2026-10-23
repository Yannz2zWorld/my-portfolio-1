'use strict';
// Reads and writes data/portfolio.json in this repository through the GitHub contents API.
// Each save is a commit; Vercel then redeploys and the page shows the new data.
//   GITHUB_TOKEN   fine-grained token with Contents: read and write on this repository
//   GITHUB_REPO    owner/name (default: the repository Vercel deploys from)
//   GITHUB_BRANCH  default: main
const FILE = 'data/portfolio.json';

function config() {
  const env = process.env;
  const repo = env.GITHUB_REPO || (env.VERCEL_GIT_REPO_OWNER && env.VERCEL_GIT_REPO_SLUG ? `${env.VERCEL_GIT_REPO_OWNER}/${env.VERCEL_GIT_REPO_SLUG}` : '');
  return { token: env.GITHUB_TOKEN || '', repo, branch: env.GITHUB_BRANCH || 'main', api: env.GITHUB_API_URL || 'https://api.github.com' };
}
const configured = () => { const c = config(); return Boolean(c.token && /^[\w.-]+\/[\w.-]+$/.test(c.repo)); };

class GitHubError extends Error {
  constructor(status, message) { super(message); this.code = 'GITHUB_ERROR'; this.status = status; }
}

async function gh(path, init = {}) {
  const c = config();
  const r = await fetch(`${c.api}/repos/${c.repo}/contents/${path}`, {
    ...init,
    headers: { accept: 'application/vnd.github+json', authorization: `Bearer ${c.token}`, 'x-github-api-version': '2022-11-28', 'user-agent': 'diriku-panel', ...(init.body ? { 'content-type': 'application/json' } : {}) },
  });
  const body = await r.json().catch(() => ({}));
  return { status: r.status, body };
}

// { profile, sha } or null when the file does not exist yet.
async function read() {
  const { branch } = config();
  const r = await gh(`${FILE}?ref=${encodeURIComponent(branch)}`);
  if (r.status === 404) return null;
  if (r.status !== 200) throw new GitHubError(r.status, githubMessage(r));
  return { profile: JSON.parse(Buffer.from(r.body.content || '', 'base64').toString('utf8')), sha: r.body.sha };
}

// Commits the document. A save that raced another one (stale sha) is retried once on the new sha.
async function write(profile, message) {
  const { branch } = config();
  const content = Buffer.from(JSON.stringify(profile, null, 2) + '\n').toString('base64');
  for (let attempt = 0; attempt < 2; attempt++) {
    const current = await read();
    const r = await gh(FILE, { method: 'PUT', body: JSON.stringify({ message, content, branch, ...(current ? { sha: current.sha } : {}) }) });
    if (r.status === 200 || r.status === 201) return { commit: r.body.commit?.sha || null, at: r.body.commit?.committer?.date || new Date().toISOString() };
    if ((r.status === 409 || r.status === 422) && attempt === 0) continue;
    throw new GitHubError(r.status, githubMessage(r));
  }
}

function githubMessage(r) {
  if (r.status === 401) return 'GITHUB_TOKEN tidak valid atau sudah kedaluwarsa.';
  if (r.status === 403 || r.status === 404) return 'GITHUB_TOKEN tidak punya akses tulis ke repo ini (butuh izin Contents: Read and write).';
  return `GitHub menolak permintaan (${r.status}${r.body?.message ? ': ' + r.body.message : ''}).`;
}

module.exports = { FILE, config, configured, read, write, GitHubError };
