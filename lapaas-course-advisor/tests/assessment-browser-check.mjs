import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { questions, getQuestion, answerLabel } from '../src/assessment.js';
import { knowledgeBase } from '../src/faq.js';

const { chromium } = await import(process.argv[2] ? pathToFileURL(process.argv[2]).href : 'playwright');
const baseURL = process.argv[3] || 'http://127.0.0.1:5173/';
const browser = await chromium.launch({ headless: true, ...(process.argv[4] ? { executablePath: process.argv[4] } : {}) });
const errors = [];
const requests = [];
const checks = [];
const journeys = [];
const scenarios = [
  { id: 'J01', name: 'Complete beginner', profile: { role: 'college', goal: 'scratch', experience: 'beginner', interest: 'unsure', time: 'some', concern: 'coding' }, kind: 'cautious', topics: ['foundations', 'assisted', 'planning', 'fullstack'], project: 'Simple study FAQ explorer', width: 1440 },
  { id: 'J02', name: 'Final-year portfolio student', profile: { role: 'final-year', goal: 'portfolio', experience: 'basics', interest: 'rag', time: 'regular', concern: 'career' }, kind: 'explore', topics: ['assisted', 'fullstack', 'shipping', 'rag', 'integrations'], project: 'Study-notes question answering demo', width: 1440 },
  { id: 'J03', name: 'Freelancer seeking AI services', profile: { role: 'freelancer', goal: 'services', experience: 'tools', interest: 'client-automation', time: 'regular', concern: 'value' }, kind: 'cautious', topics: ['foundations', 'assisted', 'agents', 'integrations', 'shipping'], project: 'Client reporting draft workflow', width: 390 },
  { id: 'T04', name: 'Business owner seeking automation', profile: { role: 'business', goal: 'operations', experience: 'coding', interest: 'support-automation', time: 'regular', concern: 'access' }, kind: 'explore', topics: ['planning', 'agents', 'integrations', 'shipping'], project: 'Sample enquiry triage tool', width: 1440 },
  { id: 'T06', name: 'Time-constrained fresher', profile: { role: 'fresher', goal: 'career', experience: 'beginner', interest: 'chatbot', time: 'low', concern: 'career' }, kind: 'pause', topics: ['foundations', 'assisted', 'fullstack', 'rag', 'shipping', 'integrations'], project: 'Simple study FAQ explorer', width: 320 },
  { id: 'T07', name: 'Uncertain schedule', profile: { role: 'college', goal: 'first-app', experience: 'basics', interest: 'web', time: 'unsure', concern: 'difficulty' }, kind: 'clarify', topics: ['planning', 'fullstack', 'integrations', 'shipping'], project: 'Student project showcase', width: 768 },
  { id: 'T08', name: 'Experienced working professional', profile: { role: 'professional', goal: 'side-project', experience: 'builder', interest: 'rag', time: 'high', concern: 'starting' }, kind: 'review', topics: ['planning', 'fullstack', 'integrations', 'shipping', 'rag', 'foundations'], project: 'Work-reference question answering demo', width: 1024 },
  { id: 'A01', name: 'College student seeking an internship', profile: { role: 'college', goal: 'career', experience: 'basics', interest: 'chatbot', time: 'regular', concern: 'career' }, kind: 'explore', topics: ['fullstack', 'rag', 'shipping', 'integrations'], project: 'Campus information helper', width: 1440 },
  { id: 'A05', name: 'Working professional upskilling', profile: { role: 'professional', goal: 'upskill', experience: 'coding', interest: 'productivity-workflow', time: 'regular', concern: 'learning-development' }, kind: 'explore', topics: ['foundations', 'assisted', 'fullstack', 'agents', 'integrations'], project: 'Weekly work-planning assistant', width: 390 },
  { id: 'A08', name: 'Business owner exploring an alternative career goal', profile: { role: 'business', goalScope: 'other', goal: 'career', experience: 'coding', interest: 'business-knowledge', time: 'regular', concern: 'career' }, kind: 'explore', topics: ['fullstack', 'rag', 'shipping', 'integrations'], project: 'Business knowledge Q&A demo', width: 320 },
];

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('request', (request) => requests.push({ url: request.url(), method: request.method(), type: request.resourceType() }));
  assert.equal((await page.goto(baseURL)).status(), 200);
  await page.getByRole('button', { name: 'Find My Learning Path', exact: true }).click();
  assert.equal(await page.getByRole('button', { name: 'Back', exact: true }).isDisabled(), true);
  assert.equal(await page.getByRole('button', { name: 'Next', exact: true }).isDisabled(), true);
  assert.equal(await page.getByRole('group').count(), 1);
  assert.equal(await page.getByRole('progressbar').getAttribute('value'), '1');
  await page.getByRole('radio', { name: 'College Student', exact: true }).focus();
  await page.keyboard.press('Space');
  assert.equal(await page.getByRole('radio', { name: 'College Student', exact: true }).isChecked(), true);
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  assert.equal(await page.locator('#assessment-question').evaluate((element) => element === document.activeElement), true);
  assert.equal(await page.getByRole('button', { name: 'Next', exact: true }).isDisabled(), true);
  await page.getByRole('radio', { name: 'Build portfolio projects', exact: true }).check();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  assert.equal(await page.getByRole('radio', { name: 'College Student', exact: true }).isChecked(), true);
  await page.getByRole('radio', { name: 'Final-Year Student', exact: true }).check();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  assert.equal(await page.getByRole('radio', { name: 'Build an impressive portfolio', exact: true }).isChecked(), true);
  checks.push('Keyboard selection, unanswered Next disabled, Back boundary, change previous answer, retained later answer, progress and question focus passed');

  // FAQ remains independently accessible mid-flow, and both modules retain state.
  await page.getByRole('button', { name: 'Verified FAQs', exact: true }).click();
  await page.getByRole('searchbox').fill('job guarantee');
  await page.getByRole('button', { name: 'Find answer', exact: true }).click();
  assert.equal(await page.locator('.unknown-card p').first().innerText(), knowledgeBase.unknown_answer);
  await page.getByRole('button', { name: 'Learning Path', exact: true }).click();
  assert.equal(await page.getByRole('radio', { name: 'Build an impressive portfolio', exact: true }).isChecked(), true);
  checks.push('Mid-assessment FAQ access, unknown fallback, and resume with previous answers passed');

  // Fresh tab reload deliberately forgets all assessment answers.
  await page.reload();
  await page.getByRole('button', { name: 'Find My Learning Path', exact: true }).click();
  assert.equal(await page.locator('.assessment-option input:checked').count(), 0);
  checks.push('Reload clears assessment data; no localStorage or sessionStorage used');

  for (const scenario of scenarios) {
    await page.setViewportSize({ width: scenario.width, height: 900 });
    for (let index = 0; index < questions.length; index++) {
      const question = getQuestion(questions[index].id, scenario.profile);
      if (index === 1) {
        assert.equal(await page.getByRole('button', { name: 'Explore Other Goals', exact: true }).isVisible(), true);
        if (scenario.profile.role === 'business') assert.equal(await page.getByRole('radio', { name: 'Get an AI internship or job', exact: true }).count(), 0);
        if (scenario.profile.goalScope === 'other') await page.getByRole('button', { name: 'Explore Other Goals', exact: true }).click();
      }
      assert.equal(await page.locator('#assessment-question').innerText(), question.title);
      assert.equal(await page.getByRole('group').count(), 1);
      assert.equal(await page.getByRole('progressbar').getAttribute('value'), String(index + 1));
      assert.equal(await page.locator('.assessment-option').count(), question.options.length);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
      await page.getByRole('radio', { name: answerLabel(question.id, scenario.profile[question.id], scenario.profile), exact: true }).check();
      if (scenario.id === 'J01' && index === 0) await page.screenshot({ path: 'tests/m2-assessment-desktop.png' });
      if (scenario.id === 'J03' && index === 2) await page.screenshot({ path: 'tests/m2-assessment-mobile.png' });
      if (scenario.id === 'T04' && index === 1) await page.screenshot({ path: 'tests/adaptive-business-goals-desktop.png' });
      if (scenario.id === 'J03' && index === 3) await page.screenshot({ path: 'tests/adaptive-client-interests-mobile.png' });
      await page.getByRole('button', { name: index === 5 ? 'See My Learning Path' : 'Next', exact: true }).click();
    }
    const recommendation = page.locator('.recommendation');
    await recommendation.waitFor();
    assert.equal(await recommendation.getAttribute('data-suitability'), scenario.kind);
    assert.equal(await recommendation.locator('.profile-grid dd').count(), 6);
    for (const question of questions) {
      assert.ok((await recommendation.locator('.profile-grid').innerText()).includes(answerLabel(question.id, scenario.profile[question.id], scenario.profile)));
    }
    assert.deepEqual(await recommendation.locator('.topic-card').evaluateAll((items) => items.map((item) => item.dataset.topic)), scenario.topics);
    assert.equal(await recommendation.locator('#project-heading').innerText(), scenario.project);
    assert.match(await recommendation.locator('.project-card').innerText(), /Suggested practice project — not a guaranteed course assignment/);
    assert.equal(await recommendation.getByRole('link', { name: 'Visit Official Course Page', exact: true }).getAttribute('href'), knowledgeBase.official_course_url);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    const officialLinks = await recommendation.locator('a').evaluateAll((links) => links.map((link) => link.href));
    assert.ok(officialLinks.every((href) => [knowledgeBase.official_course_url, 'https://lapaas.com/refund-policy.html'].includes(href)));
    for (const summary of await recommendation.locator('summary').all()) await summary.click();
    const visibleText = await recommendation.innerText();
    assert.doesNotMatch(visibleText, /\d+\s*%|(?:Lapaas|the course|we) (?:guarantees|promises) (?:a job|placement|income|completion)/i);
    assert.match(visibleText, /not guaranteed/);
    if (scenario.id === 'J03') {
      assert.match(visibleText, /₹2,999/);
      assert.match(visibleText, /premium AI credits.*not verified/);
    }
    journeys.push({ id: scenario.id, name: scenario.name, width: scenario.width, inputs: scenario.profile, input_labels: questions.map(({ id }) => ({ question: id, answer: answerLabel(id, scenario.profile[id], scenario.profile) })), actual_suitability: await recommendation.locator('.suitability-card h2').innerText(), actual_kind: scenario.kind, actual_topics: await recommendation.locator('.topic-card h3').allInnerTexts(), actual_project: await recommendation.locator('#project-heading').innerText(), actual_next_step: await recommendation.locator('.next-step p').innerText(), full_displayed_output: visibleText, passed: true });
    if (scenario.id === 'J02') {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: 'tests/m2-recommendation-desktop.png', fullPage: true });
    }
    if (scenario.id === 'J03') {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: 'tests/m2-recommendation-mobile.png', fullPage: true });
    }
    await recommendation.getByRole('button', { name: 'Explore Verified FAQs', exact: true }).click();
    assert.equal(await page.getByRole('searchbox').isVisible(), true);
    await page.getByRole('searchbox').fill('Does Lapaas guarantee a salary of 20 LPA and lifetime one-to-one mentorship?');
    await page.getByRole('button', { name: 'Find answer', exact: true }).click();
    assert.equal(await page.locator('.unknown-card p').first().innerText(), knowledgeBase.unknown_answer);
    await page.getByRole('button', { name: 'Learning Path', exact: true }).click();
    assert.equal(await recommendation.getAttribute('data-suitability'), scenario.kind);

    if (scenario.id === 'J02') {
      await page.getByRole('button', { name: 'Edit answers', exact: true }).click();
      assert.equal(await page.getByRole('radio', { name: 'Final-Year Student', exact: true }).isChecked(), true);
      for (let index = 0; index < questions.length; index++) {
        if (index === 4) await page.getByRole('radio', { name: 'Less than 2 hours', exact: true }).check();
        await page.getByRole('button', { name: index === 5 ? 'See My Learning Path' : 'Next', exact: true }).click();
      }
      assert.equal(await recommendation.getAttribute('data-suitability'), 'pause');
      assert.match(await recommendation.locator('.main-goal').innerText(), /Build an impressive portfolio/);
      checks.push('Editing a completed portfolio profile preserves other answers and recomputes a pause recommendation when time is reduced');
    }
    await page.getByRole('button', { name: 'Start over', exact: true }).click();
    assert.equal(await page.locator('.assessment-option input:checked').count(), 0);
    assert.equal(await page.getByRole('button', { name: 'Next', exact: true }).isDisabled(), true);
  }
  checks.push('Ten full adaptive profiles passed across desktop, tablet and mobile; FAQ access/return and fresh restart passed for every profile');

  // Requested role-change regression: clear incompatible dependents while preserving
  // independent answers, then complete a different, valid recommendation.
  const business = { role: 'business', goal: 'operations', experience: 'coding', interest: 'internal-workflow', time: 'regular', concern: 'business-relevance' };
  await page.setViewportSize({ width: 390, height: 900 });
  for (let index = 0; index < questions.length; index++) {
    const id = questions[index].id;
    await page.getByRole('radio', { name: answerLabel(id, business[id], business), exact: true }).check();
    await page.getByRole('button', { name: index === 5 ? 'See My Learning Path' : 'Next', exact: true }).click();
  }
  assert.equal(await page.locator('#project-heading').innerText(), 'Internal request routing demo');
  await page.getByRole('button', { name: 'Edit answers', exact: true }).click();
  await page.getByRole('radio', { name: 'College Student', exact: true }).check();
  assert.match(await page.getByRole('status').innerText(), /cleared/);
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  assert.equal(await page.locator('.assessment-option input:checked').count(), 0);
  assert.equal(await page.getByRole('radio', { name: 'Automate repetitive business operations', exact: true }).count(), 0);
  assert.equal(await page.getByRole('button', { name: 'Next', exact: true }).isDisabled(), true);
  await page.getByRole('radio', { name: 'Get an AI internship', exact: true }).check();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  assert.equal(await page.getByRole('radio', { name: 'Comfortable with coding', exact: true }).isChecked(), true);
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  assert.equal(await page.locator('.assessment-option input:checked').count(), 0);
  await page.getByRole('radio', { name: 'Full-stack AI application', exact: true }).check();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  assert.equal(await page.getByRole('radio', { name: '5–10 hours', exact: true }).isChecked(), true);
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  assert.equal(await page.locator('.assessment-option input:checked').count(), 0);
  await page.getByRole('radio', { name: 'Career outcomes', exact: true }).check();
  await page.getByRole('button', { name: 'See My Learning Path', exact: true }).click();
  assert.equal(await page.locator('#project-heading').innerText(), 'Student project showcase');
  assert.match(await page.locator('.main-goal').innerText(), /Get an AI internship/);
  assert.doesNotMatch(await page.locator('.profile-grid').innerText(), /Business Owner|Internal workflow|Business relevance/);
  checks.push('TEST 6: Business Owner to College Student clears the old goal, interest and concern, retains coding/time, blocks unanswered steps and produces an updated student result');
  journeys.push({ id: 'A06', name: 'Business owner changed to college student', inputs_before: business, inputs_after: { role: 'college', goal: 'career', experience: 'coding', interest: 'web', time: 'regular', concern: 'career' }, actual_project: await page.locator('#project-heading').innerText(), actual_suitability: await page.locator('.suitability-card h2').innerText(), full_displayed_output: await page.locator('.recommendation').innerText(), passed: true });
  await page.getByRole('button', { name: 'Start over', exact: true }).click();

  // Switching from an explicit alternative back to role goals cannot submit the
  // hidden alternative. Role-tailored interests also change when the goal changes.
  await page.getByRole('radio', { name: 'Business Owner', exact: true }).check();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByRole('button', { name: 'Explore Other Goals', exact: true }).click();
  await page.getByRole('radio', { name: 'Get an AI internship or job', exact: true }).check();
  await page.getByRole('button', { name: 'Back to role-based goals', exact: true }).click();
  assert.equal(await page.locator('.assessment-option input:checked').count(), 0);
  assert.equal(await page.getByRole('button', { name: 'Next', exact: true }).isDisabled(), true);
  checks.push('TEST 8: explicit alternative goal completes successfully; switching back clears a now-hidden alternative and disables Next');
  await page.reload();
  await page.getByRole('button', { name: 'Find My Learning Path', exact: true }).click();
  assert.equal(await page.evaluate(() => localStorage.length + sessionStorage.length), 0);
  assert.ok(requests.every((request) => new URL(request.url).origin === new URL(baseURL).origin && request.method === 'GET'));
  checks.push('Observed traffic stayed on localhost with GET requests only; zero storage entries, no external requests or profile submission');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(await page.locator('.assessment-panel').evaluate((element) => getComputedStyle(element).animationName), 'none');
  checks.push('Reduced-motion preference disables screen animation');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  assert.equal(await page.locator('.assessment-panel').evaluate((element) => getComputedStyle(element).animationName), 'screen-enter');
  checks.push('Subtle transitions enabled without reduced-motion preference');
  assert.deepEqual(errors, []);
  checks.push('Zero browser console errors or uncaught page errors');
  await writeFile('tests/milestone-2-results.json', JSON.stringify({ executed_at: new Date().toISOString(), base_url: baseURL, journeys, checks, browser_errors: errors, network: { external_requests: 0, non_get_requests: 0, storage_entries: 0 } }, null, 2) + '\n');
  console.log(JSON.stringify({ journeys_passed: journeys.length, checks, browser_errors: errors }, null, 2));
} finally { await browser.close(); }
