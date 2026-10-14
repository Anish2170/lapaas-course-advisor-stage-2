import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { faqs, knowledgeBase } from '../src/faq.js';
import { createFaqService } from '../server/faq-service.mjs';
import { createApiServer } from '../server/http.mjs';

const { chromium } = await import(process.argv[2] ? pathToFileURL(process.argv[2]).href : 'playwright');
const baseURL = process.argv[3] || 'http://127.0.0.1:5173/';
const browser = await chromium.launch({ headless: true, ...(process.argv[4] ? { executablePath: process.argv[4] } : {}) });
const errors = [], checks = [], layouts = [], cases = [];
let offlineServer;
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  assert.equal((await page.goto(baseURL)).status(), 200);
  assert.ok((await page.locator('.intro h1').innerText()).trim());
  assert.ok((await page.locator('.intro > p').innerText()).trim());
  const benefitIds = await page.locator('.course-benefit').evaluateAll((cards) => cards.map((card) => card.dataset.kbId));
  assert.deepEqual(benefitIds, ['KB005', 'KB007', 'KB011']);
  for (const id of benefitIds) {
    const card = page.locator(`.course-benefit[data-kb-id="${id}"]`);
    const fact = faqs.find((item) => item.id === id);
    assert.equal(await card.locator('p').innerText(), fact.answer);
    assert.equal(await card.locator('a').getAttribute('href'), fact.source_url);
    assert.equal(await card.locator('a').getAttribute('rel'), 'noopener noreferrer');
  }
  assert.equal(await page.locator('.faq-library .answer-card').count(), 16);
  assert.equal(await page.getByRole('link', { name: 'Official course', exact: true }).getAttribute('href'), knowledgeBase.official_course_url);
  assert.equal(await page.getByRole('searchbox').isVisible(), true);
  checks.push('Landing headline, value proposition, three exact KB benefits and official source links; 16 FAQ records preserved');

  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.equal(await page.locator('.course-benefit').count(), 3);
    const columns = await page.locator('.benefit-grid').evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length);
    assert.equal(columns, width <= 900 ? 1 : 3);
    const cta = page.getByRole('button', { name: 'Find My Learning Path', exact: true });
    await cta.scrollIntoViewIfNeeded();
    await cta.click();
    assert.equal(await page.getByRole('radio', { name: 'College Student', exact: true }).isVisible(), true);
    await page.getByRole('button', { name: 'Verified FAQs', exact: true }).click();
    layouts.push({ width, horizontal_overflow: false, benefit_columns: columns, cta_opened_assessment: true });
    if ([390, 1440].includes(width)) {
      await page.screenshot({ path: `tests/stage-2-landing-${width}.png`, fullPage: true });
      await page.screenshot({ path: `tests/stage-2-landing-${width}-viewport.png` });
    }
  }
  checks.push('Landing and CTA usable at 320, 390, 768, 1024 and 1440 pixels');

  const unsupported = 'Does Lapaas guarantee a salary of 20 LPA and lifetime one-to-one mentorship?';
  await page.getByRole('searchbox').fill(unsupported);
  await page.getByRole('searchbox').press('Enter');
  await page.locator('.search-result .unknown-card').waitFor();
  assert.equal(await page.locator('.search-result .answer-card').count(), 0);
  const unknown = await page.locator('.search-result .unknown-card p').first().innerText();
  assert.equal(unknown, knowledgeBase.unknown_answer);
  cases.push({ id: 'S2-05', user_profile: 'Visitor seeking unverified guarantees', exact_inputs: [unsupported], expected: 'No verified answer or salary/mentorship promise; original unknown fallback and official next step', actual_displayed_response: await page.locator('.search-result').innerText(), actual_fallback: unknown, pass: true, issue_found: 'None', improvement_made: 'No matching change required; exact mandatory assignment scenario added to repeatable browser checks', retest_result: 'Passed on current audited app' });

  // Real production static server with no credential and a provider that cannot be called.
  // Fixed alternate port avoids disturbing the user's development server.
  const offlineOrigin = 'http://127.0.0.1:8792';
  let providerCalls = 0;
  offlineServer = createApiServer({
    service: createFaqService({ apiKey: '', enabled: false, fetchImpl: async () => { providerCalls++; throw new Error('Provider must not be called'); } }),
    appOrigin: offlineOrigin, serveDist: true,
  });
  await new Promise((resolve, reject) => { offlineServer.once('error', reject); offlineServer.listen(8792, '127.0.0.1', resolve); });
  const traffic = [];
  const offline = await browser.newPage({ viewport: { width: 390, height: 900 }, reducedMotion: 'reduce' });
  offline.on('pageerror', (error) => errors.push(error.message));
  offline.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  offline.on('request', (request) => traffic.push(request.url()));
  assert.equal((await offline.goto(offlineOrigin)).status(), 200);
  assert.equal((await (await fetch(`${offlineOrigin}/api/health`)).json()).geminiConfigured, false);
  for (const [question, expectedId] of [['Course ki fees kitni hai bhai?', 'KB009'], ['Mujhe codding nahi aati, join kr skta hu?', 'KB003']]) {
    await offline.getByRole('searchbox').fill(question);
    await offline.getByRole('searchbox').press('Enter');
    const answer = offline.locator('.search-result .answer');
    await answer.waitFor();
    assert.deepEqual(await answer.allInnerTexts(), [faqs.find((faq) => faq.id === expectedId).answer]);
    cases.push({ id: `OFFLINE-${expectedId}`, exact_input: question, actual_displayed_response: await answer.innerText(), pass: true });
  }
  await offline.getByRole('searchbox').fill('क्या कॉलेज के टाइमटेबल के हिसाब से अपनी गति से पढ़ सकता हूँ?');
  await offline.getByRole('searchbox').press('Enter');
  await offline.locator('.search-result .chat-error').waitFor();
  assert.match(await offline.locator('.search-result .chat-error').innerText(), /switched off/);
  assert.equal(await offline.locator('.search-result .unknown-card p').first().innerText(), knowledgeBase.unknown_answer);
  cases.push({ id: 'OFFLINE-SEMANTIC', actual_displayed_response: await offline.locator('.search-result').innerText(), pass: true });
  await offline.getByRole('button', { name: 'Find My Learning Path', exact: true }).click();
  for (const [index, answer] of ['College Student', 'Learn AI from scratch', 'Complete beginner', 'Not Sure Yet', '2–5 hours', "I don't know coding"].entries()) {
    await offline.getByRole('radio', { name: answer, exact: true }).check();
    await offline.getByRole('button', { name: index === 5 ? 'See My Learning Path' : 'Next', exact: true }).click();
  }
  assert.equal(await offline.locator('.recommendation .suitability-card h2').innerText(), 'A possible starting point, with a practice plan');
  assert.equal(await offline.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.equal(providerCalls, 0);
  assert.ok(traffic.every((url) => new URL(url).origin === offlineOrigin));
  for (const path of ['/.env.local', '/.env', '/src/main.jsx', '/.git/config', '/server/config.mjs']) {
    assert.equal((await fetch(`${offlineOrigin}${path}`)).status, 404);
  }
  checks.push('Production app with Gemini disabled and no key: Hinglish/typo FAQs, unresolved-question fallback, full beginner assessment, no provider calls or external requests');
  checks.push('Production denies .env, source, server configuration and Git paths');
  assert.deepEqual(errors, []);
  await writeFile('tests/stage-2-browser-results.json', JSON.stringify({ executed_at: new Date().toISOString(), base_url: baseURL, benefit_ids: benefitIds, layouts, cases, checks, provider_calls_in_disabled_mode: providerCalls, browser_errors: errors }, null, 2) + '\n');
  console.log(JSON.stringify({ cases_passed: cases.length, layouts, checks, browser_errors: errors }, null, 2));
} finally {
  if (offlineServer) { offlineServer.closeAllConnections(); await new Promise((resolve) => offlineServer.close(resolve)); }
  await browser.close();
}
