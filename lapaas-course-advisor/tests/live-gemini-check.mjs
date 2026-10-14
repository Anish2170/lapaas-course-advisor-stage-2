import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { localMatch, byId } from '../src/faq-hybrid.js';
import { knowledgeBase } from '../src/faq.js';

const baseURL = process.argv[2] || 'http://127.0.0.1:5173/';
const origin = new URL(baseURL).origin;
const cases = [
  ['मेरे कॉलेज के टाइमटेबल से अलग अपने समय पर पढ़ पाऊँगा?', ['KB007']],
  ['Can I go through the material on my own schedule instead of joining a fixed timetable?', ['KB007']],
  ['Apni speed se padh paunga ya roz kisi fixed waqt class join karni padegi?', ['KB007']],
  ['Ek baar join karne ke liye jeb se kitne rupaye nikalne padenge?', ['KB009']],
  ['Will it prepare me to program FPGA hardware?', []],
];
const results = [];
const health = await (await fetch(new URL('/api/health', baseURL))).json();
assert.equal(health.geminiConfigured, true, 'Server has not loaded the Gemini key');
for (const [question, expectedIds] of cases) {
  assert.ok(localMatch(question).parts.some((part) => part.status === 'needs_llm'), 'Live test must exercise the provider');
  const started = Date.now();
  const response = await fetch(new URL('/api/faq', baseURL), { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ question }), signal: AbortSignal.timeout(18000) });
  assert.equal(response.status, 200);
  const result = await response.json();
  const ids = [...new Set(result.parts.flatMap((part) => part.ids))];
  const passed = !result.code && result.mode === 'hybrid' && JSON.stringify(ids) === JSON.stringify(expectedIds);
  results.push({ question, expected_ids: expectedIds, actual_ids: ids, code: result.code || null, mode: result.mode, statuses: result.parts.map((part) => part.status), elapsed_ms: Date.now() - started, actual_answers: ids.map((id) => byId.get(id)?.answer), unknown_answer: ids.length ? null : knowledgeBase.unknown_answer, passed });
  await writeFile('tests/live-gemini-results.json', JSON.stringify({ executed_at: new Date().toISOString(), provider: health.provider, model: health.model, live_provider_attempted: true, results }, null, 2) + '\n');
  console.log(JSON.stringify(results.at(-1)));
  if (!passed) throw new Error(`Live verification failed (${result.code || 'unexpected classification'}); stopped further calls for diagnosis.`);
}
console.log(`Live Gemini checks passed: ${results.length}. No credentials were displayed or saved.`);
