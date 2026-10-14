import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const exposed = loadEnv(mode, process.cwd(), 'VITE_');
  if (Object.keys(exposed).some((name) => /KEY|SECRET|TOKEN/i.test(name))) throw new Error('VITE_ secrets are forbidden. Use server-only GEMINI_API_KEY.');
  const proxy = { '/api': { target: process.env.FAQ_API_TARGET || 'http://127.0.0.1:8787', changeOrigin: false } };
  return { server: { proxy }, preview: { proxy } };
});
