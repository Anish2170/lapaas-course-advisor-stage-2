import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
export function createApiServer({ service, appOrigin = 'http://127.0.0.1:5173', serveDist = false, requestsPerMinute = 12, now = Date.now } = {}) {
  const origins = new Set([appOrigin]);
  const buckets = new Map();
  function send(res, status, payload) {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' });
    res.end(JSON.stringify(payload));
  }
  const server = createServer(async (req, res) => {
    try {
      const pathname = new URL(req.url, 'http://localhost').pathname;
      // UptimeRobot defaults to HEAD; liveness checks never call Gemini or consume FAQ limits.
      if (pathname === '/api/health' && ['GET', 'HEAD'].includes(req.method)) return send(res, 200, service.health());
      if (pathname === '/api/faq') {
        if (req.method !== 'POST') return send(res, 405, { code: 'method_not_allowed' });
        if (!origins.has(req.headers.origin) || req.headers['sec-fetch-site'] === 'cross-site') return send(res, 403, { code: 'origin_not_allowed' });
        if (!(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) return send(res, 415, { code: 'json_required' });
        const address = req.socket.remoteAddress || 'unknown'; // Never trust client-supplied forwarded IPs.
        const current = now();
        for (const [key, bucket] of buckets) if (current - bucket.start >= 60000) buckets.delete(key);
        if (buckets.size >= 256 && !buckets.has(address)) buckets.delete(buckets.keys().next().value);
        const bucket = buckets.get(address) || { start: current, count: 0 };
        bucket.count++; buckets.set(address, bucket);
        if (bucket.count > requestsPerMinute) { res.setHeader('Retry-After', '60'); return send(res, 429, { code: 'rate_limited' }); }
        if (Number(req.headers['content-length']) > 4096) return send(res, 413, { code: 'request_too_large' });
        let size = 0;
        const chunks = [];
        for await (const chunk of req) {
          size += chunk.length;
          if (size > 4096) { send(res, 413, { code: 'request_too_large' }); req.resume(); return; }
          chunks.push(chunk);
        }
        let body;
        try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return send(res, 400, { code: 'invalid_json' }); }
        if (!body || Array.isArray(body) || Object.keys(body).some((key) => key !== 'question') || typeof body.question !== 'string' || !body.question.trim() || body.question.length > 800) return send(res, 400, { code: 'invalid_question' });
        // Operational failure is an explicit fallback result, never a raw provider error.
        const result = await service.answer(body.question);
        return send(res, 200, result);
      }
      if (serveDist && req.method === 'GET') {
        const asset = /^\/assets\/[a-zA-Z0-9_-]+\.(?:js|css)$/.test(pathname);
        if (pathname === '/' || pathname === '/index.html' || asset) {
          const data = await readFile(`${dist}${asset ? pathname.slice(1) : 'index.html'}`);
          const type = pathname.endsWith('.js') ? 'text/javascript' : pathname.endsWith('.css') ? 'text/css' : 'text/html';
          res.writeHead(200, { 'Content-Type': `${type}; charset=utf-8`, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': asset ? 'public, max-age=31536000, immutable' : 'no-cache', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'" });
          return res.end(data);
        }
      }
      send(res, 404, { code: 'not_found' });
    } catch { if (!res.headersSent) send(res, 500, { code: 'server_error' }); else res.end(); }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  server.maxHeadersCount = 40;
  return server;
}
