import test from 'node:test';
import assert from 'node:assert/strict';
import { faqs } from '../src/faq.js';
import { faqSources, getFaqSource } from '../src/faq-sources.js';

const sections = ['about', 'audience', 'faq', 'mastery', 'faq', 'audience', 'faq', 'faq', 'pricing', 'faq', 'faq', 'faq', 'guarantee', 'faq', 'fit', 'faq'];
for (const [index, faq] of faqs.entries()) {
  test(`${faq.id}: relevant official section and honest navigation label`, () => {
    const original = structuredClone(faq);
    const source = getFaqSource(faq);
    assert.equal(source.href, `https://cohort.lapaas.com/#${sections[index]}`);
    assert.ok(source.label.includes(faq.source_section), 'Preserve original source attribution');
    if (sections[index] === 'faq') {
      assert.match(source.label, /FAQ section/);
      assert.match(source.note, /^Section link only; expand “.+” on the official page\.$/);
      assert.ok(source.note.includes(faqSources[faq.id].question));
    }
    assert.deepEqual(faq, original, 'Navigation must not mutate a verified fact');
  });
}
test('mapping covers exactly the supplied 16 FAQ IDs', () => {
  assert.deepEqual(Object.keys(faqSources).sort(), faqs.map((faq) => faq.id).sort());
});
test('missing mapping keeps the official homepage and explains the limitation', () => {
  const source = getFaqSource(faqs[2], {});
  assert.equal(source.href, faqs[2].source_url);
  assert.equal(source.label, 'Official course page');
  assert.match(source.note, /Direct section link unavailable/);
  assert.ok(source.note.includes(faqs[2].source_section));
});
test('unknown section is not fabricated into an external URL', () => {
  for (const section of ['missing-section', 'constructor', 'https://unrelated.example/']) {
    const source = getFaqSource(faqs[0], { KB001: { section } });
    assert.equal(source.href, faqs[0].source_url);
    assert.equal(source.label, 'Official course page');
    assert.match(source.note, /Direct section link unavailable/);
  }
});
