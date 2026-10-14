// Keep the supplied JSON as the single source of course facts.
import knowledgeBase from '../../data/course_knowledge_base.json' with { type: 'json' };

export { knowledgeBase };
export const faqs = knowledgeBase.verified_faq;
export const categories = [...new Set(faqs.map((faq) => faq.category))];

export function normalize(text) {
  return text.toLowerCase().normalize('NFKC').replace(/[^a-z0-9]+/g, ' ').trim();
}

// These are language equivalents, not additional course claims.
const synonyms = {
  fee: 'price', fees: 'price', cost: 'price', costs: 'price', pricing: 'price',
  certification: 'certificate', prerequisites: 'coding', prerequisite: 'coding',
  beginner: 'beginner', beginners: 'beginner', classes: 'class', lessons: 'lesson',
  topics: 'topic', students: 'student', freshers: 'fresher',
};
const stopWords = new Set(('a an the this that it its is are do does did i me my we you your ' +
  'can could will would should what which who how when where for to of in on at with ' +
  'please tell about course lapaas much').split(' '));

function tokens(text) {
  return [...new Set(normalize(text).split(' ').filter((word) => word && !stopWords.has(word))
    .map((word) => synonyms[word] || word))];
}

/** Fail closed: exact question/alias, or full meaningful-token coverage of one FAQ. */
export function findAnswer(query) {
  const normalized = normalize(query);
  if (!normalized) return { kind: 'empty' };
  const unknown = () => ({ kind: 'unknown', answer: knowledgeBase.unknown_answer });
  if (knowledgeBase.unverified_examples.some((item) => normalize(item.question) === normalized)) {
    return unknown();
  }
  const exact = faqs.find((faq) => [faq.question, ...faq.aliases]
    .some((phrase) => normalize(phrase) === normalized));
  if (exact) return { kind: 'verified', faq: exact };

  const queryTokens = tokens(query);
  if (!queryTokens.length) return unknown();
  const matches = faqs.filter((faq) => [faq.question, ...faq.aliases].some((phrase) => {
    const phraseTokens = tokens(phrase);
    return queryTokens.every((word) => phraseTokens.includes(word));
  }));
  // Never pick the first item when two records could fit, or ignore unmatched words.
  return matches.length === 1 ? { kind: 'verified', faq: matches[0] } : unknown();
}

export const categoryLabel = (category) => category.replaceAll('_', ' ')
  .replace(/\b\w/g, (letter) => letter.toUpperCase());
