import { loadConfig } from './config.mjs';
import { createFaqService } from './faq-service.mjs';
import { createApiServer } from './http.mjs';

const config = loadConfig();
const service = createFaqService(config);
const server = createApiServer({ service, appOrigin: config.appOrigin, serveDist: process.argv.includes('--production') });
server.on('error', (error) => { console.error(`Server could not start (${error.code || 'configuration error'}).`); process.exit(1); });
server.listen(config.port, config.host, () => console.log(`FAQ API listening on http://${config.host}:${config.port}; Gemini ${service.health().geminiConfigured ? 'configured' : 'not configured (local matching remains available)'}.`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
