import { spawn } from 'node:child_process';
import { loadConfig } from '../server/config.mjs';
import { createFaqService } from '../server/faq-service.mjs';
import { createApiServer } from '../server/http.mjs';

const config = loadConfig();
const service = createFaqService(config);
const server = createApiServer({ service, appOrigin: config.appOrigin });
let vite;
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true; vite?.kill(); server.close();
  setTimeout(() => process.exit(code), 100).unref();
}
server.on('error', (error) => { console.error(`FAQ API could not start (${error.code || 'configuration error'}).`); stop(1); });
server.listen(config.port, config.host, () => {
  console.log(`FAQ API: http://${config.host}:${config.port}; Gemini ${service.health().geminiConfigured ? 'configured' : 'not configured — add GEMINI_API_KEY to .env.local when ready'}.`);
  const env = { ...process.env };
  for (const name of Object.keys(env)) if (/^(?:GEMINI_|GOOGLE_API_KEY)/.test(name)) delete env[name];
  env.FAQ_API_TARGET = `http://${config.host}:${config.port}`;
  vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', ...process.argv.slice(2)], { stdio: 'inherit', env });
  vite.on('exit', (code) => stop(code || 0));
  vite.on('error', () => stop(1));
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => stop());
