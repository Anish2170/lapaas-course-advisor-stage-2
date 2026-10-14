import test from 'node:test';
import assert from 'node:assert/strict';
import { createApiServer } from '../server/http.mjs';
import { createFaqService } from '../server/faq-service.mjs';

const origin = 'http://127.0.0.1:5173';
async function withServer(run, options = {}) {
  const server = createApiServer({ service: createFaqService(), appOrigin: origin, ...options });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const url = `http://127.0.0.1:${server.address().port}`;
  try { await run(url); } finally { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); }
}
const post = (url, body, headers = {}) => fetch(`${url}/api/faq`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });

test('HTTP API returns verified IDs; health never exposes a credential', async () => withServer(async (url) => {
  const response = await post(url, { question: 'price' });
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).parts[0].ids, ['KB009']);
  const health = await (await fetch(`${url}/api/health`)).json();
  assert.equal(health.geminiConfigured, false);
  assert.deepEqual(Object.keys(health).sort(), ['dataChecked', 'geminiConfigured', 'model', 'provider']);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('access-control-allow-origin'), null);
}));
test('HTTP API rejects cross-origin requests and non-POST methods', async () => withServer(async (url) => {
  assert.equal((await post(url, { question: 'price' }, { Origin: 'https://untrusted.example' })).status, 403);
  assert.equal((await post(url, { question: 'price' }, { Origin: 'null' })).status, 403);
  assert.equal((await fetch(`${url}/api/faq`)).status, 405);
}));
test('uptime health checks accept GET and HEAD without credentials, Gemini calls or FAQ rate limits', async () => {
  let providerCalls = 0;
  await withServer(async (url) => {
    for (const method of ['HEAD', 'GET', 'HEAD']) {
      const response = await fetch(`${url}/api/health`, { method });
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      if (method === 'HEAD') assert.equal(await response.text(), '');
      else assert.deepEqual(Object.keys(await response.json()).sort(), ['dataChecked', 'geminiConfigured', 'model', 'provider']);
    }
    assert.equal(providerCalls, 0);
    assert.equal((await post(url, { question: 'price' })).status, 429);
  }, { requestsPerMinute: 0, service: createFaqService({ apiKey: 'test-server-only-key', fetchImpl: async () => { providerCalls++; throw new Error('Health must not invoke Gemini'); } }) });
});
test('HTTP API rejects malformed JSON, extra profile/history fields, non-JSON and invalid questions', async () => withServer(async (url) => {
  assert.equal((await post(url, '{bad')).status, 400);
  assert.equal((await post(url, { question: 'price', profile: { name: 'do-not-send' } })).status, 400);
  assert.equal((await post(url, { question: 'price', history: ['private'] })).status, 400);
  assert.equal((await post(url, { question: '' })).status, 400);
  assert.equal((await post(url, { question: ['price'] })).status, 400);
  assert.equal((await post(url, { question: 'a'.repeat(801) })).status, 400);
  assert.equal((await post(url, { question: 'price' }, { 'Content-Type': 'text/plain' })).status, 415);
}));
test('HTTP API enforces byte-size and per-client request limits', async () => withServer(async (url) => {
  assert.equal((await post(url, { question: 'a'.repeat(5000) })).status, 413);
  assert.equal((await post(url, { question: 'price' })).status, 200);
  const limited = await post(url, { question: 'price' });
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get('retry-after'), '60');
}, { requestsPerMinute: 2 }));
test('production server never serves .env, source, repository or traversal paths', async () => withServer(async (url) => {
  for (const path of ['/.env', '/.env.local', '/server/config.mjs', '/src/main.jsx', '/.git/config', '/assets/../../.env.local']) {
    assert.equal((await fetch(`${url}${path}`)).status, 404, path);
  }
}, { serveDist: true }));
