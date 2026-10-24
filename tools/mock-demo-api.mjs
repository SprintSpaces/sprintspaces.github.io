// A stand-in for the demo service, for looking at the section in a browser: it serves this site and answers the three endpoints.
// The scenario is chosen with  GET /__scenario?name=normal|full|rate|offline|expired|badurl|slow   and the site's meta tag is pointed at this
// server on the fly (the committed page has an empty address, so the section stays off until the real service address is set).
//   node tools/mock-demo-api.mjs [port]
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const port = Number(process.argv[2]) || 4180;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.xml': 'text/xml', '.txt': 'text/plain' };
const TTL = Number(process.env.MOCK_TTL) || 90;
let scenario = 'normal', polls = 0, active = 0, total = 41, readyAt = 0;

const json = (res, code, body, extra = {}) => { res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extra }); res.end(JSON.stringify(body)); };

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  if (url.pathname === '/__scenario') { scenario = url.searchParams.get('name') || 'normal'; polls = 0; readyAt = 0; return json(res, 200, { scenario }); }
  if (url.pathname === '/v1/stats') {
    if (scenario === 'offline') return res.destroy();
    return json(res, 200, { active: scenario === 'full' ? 3 : active, max: 3, ttl_seconds: 900, expiry_policy: 'idle', idle_timeout_seconds: 900, total_ready: total, full: scenario === 'full' });
  }
  if (url.pathname === '/v1/demos' && req.method === 'POST') {
    if (scenario === 'offline') return res.destroy();
    let body = ''; for await (const c of req) body += c;
    const b = JSON.parse(body || '{}');
    if (scenario === 'full') return json(res, 503, { error: 'full', active: 3, max: 3 });
    if (scenario === 'rate') return json(res, 429, { error: 'rate_limited' }, { 'Retry-After': '5' });
    polls = 0; readyAt = 0; active = Math.min(3, active + 1);
    return json(res, 202, { job: 'j'.repeat(64), state: 'starting', _profile: b.profile });
  }
  if (url.pathname.startsWith('/v1/demos/')) {
    if (scenario === 'offline') return res.destroy();
    polls++;
    if (polls < 5) return json(res, 200, { state: 'starting', progress: 5 + polls * 18, profile: 'plain', first_login: [] });
    if (!readyAt) { readyAt = Date.now(); total++; }
    const left = scenario === 'expired' ? -1 : TTL - (Date.now() - readyAt) / 1000;
    if (left <= 0) return json(res, 200, { state: 'ended', progress: 100, profile: 'plain' });
    const url2 = scenario === 'badurl' ? 'https://evil.example/' : 'https://rzutki-pingwin.byst.re/';
    return json(res, 200, { state: 'ready', expiry_policy: 'idle', idle_timeout_seconds: 900, progress: 100, url: url2, username: 'demo@demo-0123456789ab.demo.invalid', password: 'Ab3dEf6hJk9mNp2qRs5t', expires_at: new Date(Date.now() + left * 1000).toISOString(), profile: 'plain', first_login: [] });
  }
  // the site itself
  let path = normalize(url.pathname).replace(/^(\.\.[/\\])+/, '');
  if (path.endsWith('/')) path += 'index.html';
  try {
    let data = await readFile(join(root, path));
    if (path.endsWith('index.html')) data = Buffer.from(data.toString().replace('<meta name="demo-api" content="">', `<meta name="demo-api" content="http://localhost:${port}">`));
    res.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  } catch { res.writeHead(404); res.end('not found'); }
}).listen(port, '127.0.0.1', () => console.log(`mock demo service and site on http://127.0.0.1:${port}`));
