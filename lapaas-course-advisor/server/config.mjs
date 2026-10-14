import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export function loadConfig() {
  // Local file wins over .env; explicit process variables win over either file.
  for (const file of ['../.env.local', '../.env']) {
    const path = fileURLToPath(new URL(file, import.meta.url));
    if (existsSync(path)) process.loadEnvFile(path);
  }
  if (Object.keys(process.env).some((name) => /^VITE_.*(?:KEY|SECRET|TOKEN)/i.test(name))) throw new Error('Remove secret variables with a VITE_ prefix. Secrets must be server-only.');
  return {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
    enabled: process.env.GEMINI_ENABLED !== 'false',
    host: process.env.API_HOST || '127.0.0.1', port: Number(process.env.API_PORT || process.env.PORT || 8787),
    appOrigin: process.env.APP_ORIGIN || 'http://127.0.0.1:5173',
  };
}
