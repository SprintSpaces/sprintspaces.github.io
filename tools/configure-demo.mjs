// Final publication step: verify the public service and its CORS policy before
// writing its origin into the static page. No webhook or application secret.
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export async function configuredPage(html, raw, doFetch = fetch) {
  const api = new URL(raw);
  if (api.protocol !== 'https:' || api.username || api.password || api.port || api.search || api.hash || api.pathname !== '/') {
    throw Error('Demo API must be an HTTPS origin without credentials, port, path or query');
  }
  const meta = /<meta name="demo-api" content="[^"]*">/g;
  if ([...html.matchAll(meta)].length !== 1) throw Error('Page must contain exactly one demo-api meta element');
  const response = await doFetch(api.origin + '/v1/stats', {
    headers: { Origin: 'https://sprintspaces.github.io' },
    credentials: 'omit', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(10000),
  });
  if (response.status !== 200 || response.headers.get('access-control-allow-origin') !== 'https://sprintspaces.github.io') {
    throw Error('Public Demo stats or CORS check failed');
  }
  const data = await response.json();
  if (!Number.isSafeInteger(data.active) || !Number.isSafeInteger(data.max) || !Number.isSafeInteger(data.total_ready)
      || data.active < 0 || data.active > data.max || data.max !== 3 || data.ttl_seconds !== 900 || data.expiry_policy !== 'idle' || data.idle_timeout_seconds !== 900 || data.total_ready < 0) {
    throw Error('Public Demo counters violate the capacity contract');
  }
  return html.replace(meta, `<meta name="demo-api" content="${api.origin}">`);
}

export async function configuredPages(pages, raw, doFetch = fetch) {
  const meta = /<meta name="demo-api" content="[^"]*">/g;
  if (!pages.length || pages.some(html => [...html.matchAll(meta)].length !== 1)) {
    throw Error('Every language page must contain exactly one demo-api meta element');
  }
  const first = await configuredPage(pages[0], raw, doFetch);
  const configuredMeta = first.match(meta)[0];
  return pages.map(html => html.replace(meta, configuredMeta));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 3) throw Error('Usage: node tools/configure-demo.mjs https://PUBLIC-DEMO-API');
    const pages = ['../index.html', '../en/index.html'].map(file => new URL(file, import.meta.url));
    const html = await Promise.all(pages.map(page => readFile(page, 'utf8')));
    const next = await configuredPages(html, process.argv[2]);
    for (let i = 0; i < pages.length; i++) await writeFile(pages[i], next[i]);
    console.log('Configured the public Demo endpoint in both languages after live stats/CORS checks. Review and publish the pages; real launch/cleanup acceptance is still required.');
  } catch (e) { console.error(e.message); process.exitCode = 1; }
}
