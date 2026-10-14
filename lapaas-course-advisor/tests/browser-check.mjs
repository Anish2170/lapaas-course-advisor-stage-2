import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { faqs, knowledgeBase } from '../src/faq.js';
import { getFaqSource } from '../src/faq-sources.js';

// Run with an installed Playwright module path; it is not a runtime app dependency.
const playwrightPath = process.argv[2];
const { chromium } = await import(playwrightPath ? pathToFileURL(playwrightPath).href : 'playwright');
const baseURL = process.argv[3] || 'http://127.0.0.1:5173/';
const browser = await chromium.launch({ headless: true, ...(process.argv[4] ? { executablePath: process.argv[4] } : {}) });
const errors = [];
const results = [];
const checks = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  const response = await page.goto(baseURL);
  assert.equal(response.status(), 200);
  await page.locator('.faq-grid .answer-card').first().waitFor();
  assert.equal(await page.locator('.faq-grid .answer-card').count(), 16);
  assert.match(await page.locator('.prototype-banner').innerText(), /Independent internship prototype - not an official Lapaas website/);
  checks.push('HTTP 200; React rendered all 16 answers; independent prototype label displayed');
  const links = await page.locator('.card-source a').evaluateAll((items) => items.map((item) => ({ href: item.href, label: item.textContent, target: item.target, rel: item.rel })));
  assert.equal(links.length, 16);
  assert.ok(links.every((link, index) => link.href === getFaqSource(faqs[index]).href && link.label && link.target === '_blank' && link.rel.includes('noopener') && link.rel.includes('noreferrer')));
  assert.equal(await page.locator('.policy-link').getAttribute('href'), 'https://lapaas.com/refund-policy.html');
  checks.push('All 16 answer source labels and official URLs, safe external-link attributes, and refund policy URL verified in DOM');
  await page.screenshot({ path: 'tests/desktop-preview.png' });

  const cases = [
    ...faqs.map((faq) => ({ query: faq.question, faq })),
    ...['Can I join without coding?', 'Is access lifetime?', 'price', 'fees'].map((query) => ({ query, faq: faqs.find((item) => item.id === (query.includes('coding') ? 'KB003' : query.includes('access') ? 'KB008' : 'KB009')) })),
    ...knowledgeBase.unverified_examples.map((item) => ({ query: item.question })),
    ...['job guarantee', 'total lesson hours', 'guaranteed salary', 'private 1:1 mentor',
      'Does Lapaas guarantee a salary of 20 LPA and lifetime one-to-one mentorship?',
      'What is the price and can I extend access?'].map((query) => ({ query })),
  ];
  for (const { query, faq } of cases) {
    await page.getByRole('searchbox', { name: 'What would you like to know?' }).fill(query);
    await page.getByRole('searchbox').press('Enter');
    const result = page.locator('.search-result');
    await result.waitFor();
    const output = faq ? await result.locator('.answer').innerText() : await result.locator('.unknown-card p').first().innerText();
    assert.equal(output, faq?.answer || knowledgeBase.unknown_answer);
    assert.match(await result.locator('.result-heading').innerText(), new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.equal(await result.locator(faq ? '.card-source a' : '.unknown-link').getAttribute('href'), knowledgeBase.official_course_url);
    if (faq?.limitation) assert.equal(await result.locator('.limitation').innerText(), faq.limitation);
    results.push({ input: query, kind: faq ? 'verified' : 'unknown', actual_output: output, source: knowledgeBase.official_course_url, passed: true });
  }
  await page.getByRole('button', { name: 'Clear search' }).click();
  assert.equal(await page.locator('.search-result').count(), 0);
  assert.equal(await page.getByRole('searchbox').inputValue(), '');
  assert.equal(await page.getByRole('searchbox').evaluate((element) => element === document.activeElement), true);
  await page.getByRole('button', { name: 'Find answer' }).click();
  assert.equal(await page.locator('.search-result').count(), 0);
  checks.push('Clear resets input/result and returns keyboard focus; blank submission produces no invented result');

  for (const category of [...new Set(faqs.map((faq) => faq.category))]) {
    await page.locator('.category').filter({ hasText: category.replaceAll('_', ' ') }).first().click();
    assert.equal(await page.locator('.faq-grid .answer-card').count(), faqs.filter((faq) => faq.category === category).length);
  }
  await page.getByRole('button', { name: 'All questions 16' }).click();
  assert.equal(await page.locator('.faq-grid .answer-card').count(), 16);
  checks.push('Every category filters the library correctly; All questions restores all 16');
  await page.locator('.suggestions button').first().click();
  assert.equal(await page.locator('.search-result .answer').innerText(), faqs.find((faq) => faq.id === 'KB009').answer);
  await page.getByRole('button', { name: 'Clear search' }).click();
  checks.push('Suggested question works');

  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, `Overflow at ${width}px`);
    assert.equal(await page.getByRole('button', { name: 'Find answer' }).isVisible(), true);
    checks.push(`Responsive at ${width}px: no document horizontal overflow; search action visible`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'tests/mobile-preview.png' });
  await page.getByRole('searchbox').fill('total lesson hours');
  await page.getByRole('button', { name: 'Find answer' }).click();
  assert.equal(await page.locator('.unknown-card p').first().innerText(), knowledgeBase.unknown_answer);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  checks.push('Unknown-answer form submission and result layout work at 390px');
  assert.deepEqual(errors, []);
  checks.push('Zero browser console errors or uncaught page errors');
  await writeFile('tests/milestone-1-results.json', JSON.stringify({ executed_at: new Date().toISOString(), base_url: baseURL, results, checks, browser_errors: errors }, null, 2) + '\n');
  console.log(JSON.stringify({ question_cases_passed: results.length, checks, browser_errors: errors }, null, 2));
} finally {
  await browser.close();
}
