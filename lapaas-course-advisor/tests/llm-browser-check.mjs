import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { faqs, knowledgeBase } from '../src/faq.js';
import { requiredQuestions, semanticQuestion } from './llm-cases.js';
import { createFaqService } from '../server/faq-service.mjs';
import { createApiServer } from '../server/http.mjs';

const { chromium } = await import(process.argv[2] ? pathToFileURL(process.argv[2]).href : 'playwright');
const baseURL = process.argv[3] || 'http://127.0.0.1:5173/';
const browser = await chromium.launch({ headless: true, ...(process.argv[4] ? { executablePath: process.argv[4] } : {}) });
const results = [];
const checks = [];
const errors = [];
const providerRequests = [];
let fixtureServer;
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  assert.equal((await page.goto(baseURL)).status(), 200);
  await page.getByRole('searchbox').waitFor();
  async function submit(question) {
    await page.getByRole('searchbox').fill(question);
    await page.getByRole('searchbox').press('Enter');
    await page.locator('.search-result .chat-assistant .answer-card, .search-result .chat-assistant .unknown-card').first().waitFor();
    return page.locator('.search-result');
  }
  for (let index = 0; index < requiredQuestions.length; index++) {
    const [question, expectedIds] = requiredQuestions[index];
    const latest = await submit(question);
    const actualAnswers = await latest.locator('.answer').allInnerTexts();
    const expectedAnswers = expectedIds.map((id) => faqs.find((faq) => faq.id === id).answer);
    assert.deepEqual(actualAnswers, expectedAnswers);
    const actualSources = await latest.locator('.card-source a').evaluateAll((links) => links.map((link) => link.href));
    assert.ok(actualSources.every((href) => href === knowledgeBase.official_course_url));
    const unknown = expectedIds.length ? null : await latest.locator('.unknown-card p').first().innerText();
    if (!expectedIds.length) assert.equal(unknown, knowledgeBase.unknown_answer);
    results.push({ test: index + 1, input: question, actual_ids: expectedIds, actual_answers: actualAnswers, actual_unknown: unknown, source: knowledgeBase.official_course_url, mode: 'actual local matching, not a live Gemini call', passed: true });
  }
  checks.push('All 14 required questions displayed exactly the expected KB answers/fallbacks in the actual app');

  for (const [question, id] of [['कोर्स की फीस कितनी है?', 'KB009'], ['मुझे कोडिंग नहीं आती क्या मैं जुड़ सकता हूँ?', 'KB003'], ['What is the course prcie?', 'KB009']]) {
    assert.equal(await (await submit(question)).locator('.answer').innerText(), faqs.find((faq) => faq.id === id).answer);
  }
  checks.push('Additional Hindi script and adjacent-transposition typo cases passed');
  const partial = await submit('What is the price and is a job guaranteed?');
  assert.equal(await partial.locator('.answer').innerText(), faqs.find((faq) => faq.id === 'KB009').answer);
  assert.match(await partial.locator('.unverified-parts').innerText(), /job guaranteed/);
  assert.equal(await partial.locator('.unknown-card p').first().innerText(), knowledgeBase.unknown_answer);
  results.push({ test: 'partial', input: 'What is the price and is a job guaranteed?', actual_answers: await partial.locator('.answer').allInnerTexts(), actual_unknown: await partial.locator('.unknown-card p').first().innerText(), unverified_parts: await partial.locator('.unverified-parts').innerText(), passed: true });

  const health = await (await fetch(new URL('/api/health', baseURL))).json();
  if (!health.geminiConfigured) {
    const fallback = await submit(semanticQuestion);
    assert.match(await fallback.locator('.chat-error').innerText(), /not configured|switched off/);
    assert.equal(await fallback.locator('.unknown-card p').first().innerText(), knowledgeBase.unknown_answer);
    checks.push('Actual no-key mode reports unconfigured Gemini and gracefully uses the original fallback');
  }

  // Simulated Google transport, actual Node HTTP route/service and actual browser UI.
  // No real credential or Google call is used by this fixture.
  let mode = 'ok';
  const service = createFaqService({ apiKey: 'fixture-not-a-real-key', timeoutMs: 250, fetchImpl: async (url, init) => {
    assert.equal(new URL(url).hostname, 'generativelanguage.googleapis.com');
    assert.equal(init.headers['x-goog-api-key'], 'fixture-not-a-real-key');
    const body = JSON.parse(init.body);
    const parts = JSON.parse(body.contents[0].parts[0].text).untrusted_question_parts;
    providerRequests.push(parts);
    assert.ok(!JSON.stringify(parts).includes('profile'));
    if (mode === 'timeout') return new Promise(() => {});
    if (mode === 'rate') return new Response('', { status: 429 });
    if (mode === 'network') throw new Error('Fixture network failure');
    await new Promise((resolve) => setTimeout(resolve, 100));
    const classifications = parts.map(({ part_id }) => ({ part_id, status: 'matched', confidence: 'high', ids: [mode === 'bad-id' ? 'KB999' : 'KB007'], unknown_fragments: [] }));
    return new Response(JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify({ parts: classifications }) }] } }] }));
  } });
  fixtureServer = createApiServer({ service, appOrigin: new URL(baseURL).origin, requestsPerMinute: 50 });
  await new Promise((resolve, reject) => { fixtureServer.once('error', reject); fixtureServer.listen(0, '127.0.0.1', resolve); });
  const fixtureURL = `http://127.0.0.1:${fixtureServer.address().port}/api/faq`;
  await page.route('**/api/faq', async (route) => {
    const incoming = JSON.parse(route.request().postData());
    assert.deepEqual(Object.keys(incoming), ['question']);
    const response = await fetch(fixtureURL, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: new URL(baseURL).origin }, body: JSON.stringify(incoming) });
    await route.fulfill({ status: response.status, contentType: 'application/json', body: await response.text() });
  });
  await page.getByRole('searchbox').fill(semanticQuestion);
  await page.getByRole('searchbox').press('Enter');
  await page.locator('.chat-loading').waitFor();
  assert.equal(await page.getByRole('button', { name: 'Matching…', exact: true }).isDisabled(), true);
  await page.locator('.search-result .answer').waitFor();
  assert.equal(await page.locator('.search-result .answer').innerText(), faqs.find((faq) => faq.id === 'KB007').answer);
  assert.match(await page.locator('.search-result .chat-assistant-label small').innerText(), /Gemini/);
  results.push({ test: 'simulated Gemini success', input: semanticQuestion, actual_ids: ['KB007'], actual_answers: [await page.locator('.search-result .answer').innerText()], mode: 'simulated provider; real backend route and UI', passed: true });
  checks.push('Simulated Gemini-only Hindi paraphrase exercised loading, same-origin POST, backend classifier validation and original KB007 rendering');

  for (const [failureMode, expected] of [['bad-id', /could not be validated/], ['timeout', /took too long/], ['rate', /request limit/], ['network', /temporarily unavailable/]]) {
    mode = failureMode;
    const latest = await submit(semanticQuestion);
    assert.match(await latest.locator('.chat-error').innerText(), expected);
    assert.equal(await latest.locator('.unknown-card p').first().innerText(), knowledgeBase.unknown_answer);
    assert.equal(await latest.locator('.answer').count(), 0);
    results.push({ test: `simulated ${failureMode}`, input: semanticQuestion, actual_error_message: await latest.locator('.chat-error').innerText(), actual_unknown: await latest.locator('.unknown-card p').first().innerText(), mode: 'simulated provider; real backend route and UI', passed: true });
    checks.push(`Simulated ${failureMode} failure displayed a graceful message plus the original fallback, with no invented answer`);
  }
  mode = 'ok';
  const mixed = await submit(`What is the price? ${semanticQuestion}`);
  assert.deepEqual(await mixed.locator('.answer').allInnerTexts(), ['KB009', 'KB007'].map((id) => faqs.find((faq) => faq.id === id).answer));
  assert.equal(providerRequests.at(-1).length, 1);
  assert.ok(!providerRequests.at(-1)[0].text.includes('price'));
  checks.push('Mixed local/Gemini query kept the local price answer and sent only the unresolved part to the simulated provider');

  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  }
  checks.push('Chat and multipart results have no document horizontal overflow at 320/390/768/1024/1440px');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator('.search-result').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'tests/llm-chat-desktop.png' });
  await page.setViewportSize({ width: 390, height: 900 });
  await submit('Course ki fees kitni hai bhai?');
  await page.locator('.search-result').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'tests/llm-chat-mobile.png' });
  await page.getByRole('button', { name: 'Clear search', exact: true }).click();
  assert.equal(await page.locator('.search-result').count(), 0);
  assert.equal(await page.getByRole('searchbox').inputValue(), '');
  assert.equal(await page.getByRole('searchbox').evaluate((element) => element === document.activeElement), true);
  assert.equal(await page.evaluate(() => localStorage.length + sessionStorage.length), 0);
  checks.push('Clear cancels/resets chat and restores focus; no chat/profile persistence');
  assert.deepEqual(errors, []);
  checks.push('Zero browser console errors or uncaught runtime errors');
  await writeFile('tests/llm-browser-results.json', JSON.stringify({ executed_at: new Date().toISOString(), base_url: baseURL, live_gemini_tested: false, live_gemini_reason: 'This suite deliberately simulates Google transport for repeatable failure testing. Separate live-gemini-check.mjs evidence records actual configured-provider checks.', results, checks, browser_errors: errors }, null, 2) + '\n');
  console.log(JSON.stringify({ required_question_cases_passed: 14, live_gemini_tested: false, checks, browser_errors: errors }, null, 2));
} finally {
  await browser.close();
  if (fixtureServer) { fixtureServer.closeAllConnections(); await new Promise((resolve) => fixtureServer.close(resolve)); }
}
