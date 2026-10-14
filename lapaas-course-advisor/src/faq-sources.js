import { knowledgeBase } from './faq.js';

// Inspected on the official page and verified in Chrome on 14 October 2026.
// Keep navigation separate from the original knowledge-base facts/attribution.
export const sourceNavigationVerifiedOn = '2026-10-14';
export const officialSections = Object.freeze({
  about: 'https://cohort.lapaas.com/#about',
  audience: 'https://cohort.lapaas.com/#audience',
  mastery: 'https://cohort.lapaas.com/#mastery',
  pricing: 'https://cohort.lapaas.com/#pricing',
  guarantee: 'https://cohort.lapaas.com/#guarantee',
  fit: 'https://cohort.lapaas.com/#fit',
  faq: 'https://cohort.lapaas.com/#faq',
});

export const faqSources = Object.freeze(Object.fromEntries(Object.entries({
  KB001: { section: 'about' },
  KB002: { section: 'audience' },
  KB003: { section: 'faq', question: 'I do not know coding. Can I still start?' },
  KB004: { section: 'mastery' },
  KB005: { section: 'faq', question: 'What exactly will I learn to build?' },
  KB006: { section: 'audience', sectionLabel: 'audience section' },
  KB007: { section: 'faq', question: 'Is this a live course?' },
  KB008: { section: 'faq', question: 'How long can I access the course?' },
  KB009: { section: 'pricing' },
  KB010: { section: 'faq', question: 'Where do I access the course?' },
  KB011: { section: 'faq', question: 'Can I ask Sahil questions?' },
  KB012: { section: 'faq', question: 'Will I receive a certificate?' },
  KB013: { section: 'guarantee' },
  KB014: { section: 'faq', question: 'Is EMI available?' },
  KB015: { section: 'fit' },
  KB016: { section: 'faq', question: 'Will the tools become outdated?' },
}).map(([id, source]) => [id, Object.freeze(source)])));

export function getFaqSource(faq, sources = faqSources) {
  const source = Object.hasOwn(sources, faq.id) ? sources[faq.id] : undefined;
  const href = source && Object.hasOwn(officialSections, source.section) ? officialSections[source.section] : undefined;
  if (!href) return {
    href: knowledgeBase.official_course_url,
    label: 'Official course page',
    note: `Direct section link unavailable. Look for “${faq.source_section || faq.question}” on the official page.`,
  };
  // Individual official FAQ questions have no direct URL. Use the course
  // homepage, as requested, rather than implying a question-level deep link.
  if (source.question) return {
    href: knowledgeBase.official_course_url,
    label: `${faq.source_section} · course homepage`,
    note: '',
  };
  return {
    href,
    label: `${faq.source_section}${source.sectionLabel ? ` · ${source.sectionLabel}` : ''}`,
    note: '',
  };
}
