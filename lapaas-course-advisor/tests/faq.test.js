import test from 'node:test';
import assert from 'node:assert/strict';
import { faqs, findAnswer, knowledgeBase } from '../src/faq.js';

test('provided knowledge base is intact and has official sources', () => {
  assert.equal(faqs.length, 16);
  assert.equal(new Set(faqs.map((faq) => faq.id)).size, 16);
  for (const faq of faqs) {
    assert.equal(faq.status, 'verified');
    assert.equal(new URL(faq.source_url).hostname, 'cohort.lapaas.com');
    assert.ok(faq.answer && faq.source_section && faq.aliases.length);
  }
});

for (const faq of faqs) {
  for (const question of [faq.question, ...faq.aliases]) {
    test(`known question: ${question}`, () => {
      const result = findAnswer(question);
      assert.equal(result.kind, 'verified');
      assert.equal(result.faq.id, faq.id);
      assert.equal(result.faq.answer, faq.answer);
    });
  }
}

for (const [query, id] of [
  ['price', 'KB009'], ['fees', 'KB009'], ['coding', 'KB003'],
  ['access', 'KB008'], ['certificate', 'KB012'], ['community', 'KB011'],
  ['  WHAT IS THE COURSE PRICE!!!  ', 'KB009'],
]) {
  test(`language normalization: ${query}`, () => assert.equal(findAnswer(query).faq?.id, id));
}

const unknowns = [
  ...knowledgeBase.unverified_examples.map((item) => item.question),
  'Does Lapaas guarantee a salary of 20 LPA and lifetime one-to-one mentorship?',
  'guaranteed salary', 'private 1:1 mentor', 'total lesson hours',
  'What is the exact total course duration in hours?', 'job guarantee',
  'What is the discounted course price?', 'Are there 100 live classes?',
  'Does community include lifetime private support?', 'Is the certificate accredited by IIT?',
  'Is the refund unconditional?', 'Are all AI tool costs included in the price?',
  'What is the price and can I extend access?', 'price and certificate',
  'Does it teach PyTorch?', 'Can I learn to build absolutely any AI application?',
  'ragdoll', 'course', 'How is the weather?',
];
for (const query of unknowns) {
  test(`unsupported or ambiguous: ${query}`, () => {
    assert.deepEqual(findAnswer(query), { kind: 'unknown', answer: knowledgeBase.unknown_answer });
  });
}

test('blank input has no result', () => {
  assert.deepEqual(findAnswer('  '), { kind: 'empty' });
});
