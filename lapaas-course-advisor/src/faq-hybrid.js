import { faqs, findAnswer, knowledgeBase } from './faq.js';

export const MAX_QUESTION_LENGTH = 800;
export const MAX_PARTS = 4;
export const byId = new Map(faqs.map((faq) => [faq.id, faq]));
export const cleanText = (text) => text.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ').trim();
export function redactQuestion(text) {
  return text.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[email removed]')
    .replace(/\bAIza[\w-]{20,}\b/g, '[key removed]')
    .replace(/https?:\/\/\S+/gi, '[link removed]')
    .replace(/(?<!\d)(?:\+?\d[\s()-]*){9,15}(?!\d)/g, '[phone removed]')
    .replace(/(?:my name is|mera naam|मेरा नाम)\s+[\p{L}]+(?:\s+[\p{L}]+)?/giu, '[name removed]');
}
export function isInstructionAttack(text) {
  return /(?:ignore|forget|override|disregard|bypass).{0,45}(?:rule|instruction|previous|system)|(?:invent|fabricate|make up).{0,50}(?:guarantee|course|salary|fact)|system\s*prompt|api[ _-]?key|process\.env|\.env|reveal.{0,30}(?:secret|private)|पिछले.{0,20}नियम.{0,20}(?:भूल|अनदेखा)/iu.test(text);
}

const unsupportedPatterns = [
  /\b(?:job|placement|salary|income|earning|lpa|naukri|paisa kama|guaranteed|guarantee|pakka)\b|नौकरी|गारंटी|वेतन/iu,
  /\b(?:private|mentorship|mentoring|mentor|1\s*:\s*1|one.to.one)\b|निजी.{0,15}(?:मेंटर|मार्गदर्शन)/iu,
  /\b(?:total|exact).{0,25}(?:video|lesson|duration|hours)|\btotal lesson hours\b|कुल.{0,20}(?:वीडियो|घंटे)/iu,
  /\b(?:extend|extension|beyond three|premium|credits|subscriptions|mobile.only|discount|discounted|coupon|accredited|unconditional|quantum|pytorch|tensorflow)\b|क्वांटम/iu,
  /\b(?:all|extra|additional|third.party|tool).{0,25}(?:cost|included)|\b(?:free|100)\b|मुफ्त/iu,
];
export function isUnsupported(text) {
  return knowledgeBase.unverified_examples.some((item) => cleanText(item.question) === cleanText(text)) || unsupportedPatterns.some((pattern) => pattern.test(text));
}

// Language aliases only. All rendered course facts still come from the original JSON.
const languageAliases = {
  KB002: ['Is this course good for freshers?', 'Freshers ke liye hai kya?', 'क्या यह कोर्स फ्रेशर्स के लिए है'],
  KB003: ['Can I take this course without coding?', 'Mujhe coding nahi aati join kr skta hu', 'Mujhe codding nahi aati join kr skta hu', 'Coding nahi aati kya join kar sakta hu', 'मुझे कोडिंग नहीं आती क्या मैं जुड़ सकता हूँ', 'क्या बिना कोडिंग के शुरू कर सकता हूँ'],
  KB004: ['Does the course teach RAG?', 'Does it teach agents?', 'RAG sikhate ho kya', 'क्या इसमें आरएजी सिखाते हैं'],
  KB007: ['Live hai ya recorded?', 'यह कोर्स लाइव है या सेल्फ पेस्ड'],
  KB008: ['Course ki validity kitni hai', 'Course ka access kitne time tak hai', 'Can I access the course forever?', 'कोर्स की वैधता कितनी है', 'कोर्स का एक्सेस कितने समय तक रहेगा'],
  KB009: ['Course ki fees kitni hai bhai', 'Fees kitni hai', 'Course ka price kya hai', 'कितनी फीस है', 'कोर्स की फीस कितनी है', 'कोर्स की कीमत क्या है'],
  KB011: ['Community support hai kya', 'क्या कम्युनिटी सपोर्ट है'],
  KB012: ['Certificate milega kya', 'क्या सर्टिफिकेट मिलेगा'],
};
const fillers = new Set('a an the this it is are do does i me my can could would will what how much for to of in on at course lapaas please tell bhai ki ka hai kya kitni kitna mujhe kr kar skta sakta hu ho यह इस क्या मैं कोर्स की का कितनी है मुझे'.split(' '));
function phraseTokens(text) { return cleanText(text).split(' ').filter((word) => word && !fillers.has(word)); }
function closeWord(a, b) {
  if (a === b) return true;
  // Only repair one ASCII edit or adjacent transposition, never a topic substring.
  if (!/^[a-z]{4,}$/.test(a) || !/^[a-z]{4,}$/.test(b) || Math.abs(a.length - b.length) > 1) return false;
  if (a.length === b.length) {
    const differences = [...a].map((letter, index) => letter === b[index] ? -1 : index).filter((index) => index >= 0);
    return differences.length === 1 || (differences.length === 2 && differences[1] === differences[0] + 1 && a[differences[0]] === b[differences[1]] && a[differences[1]] === b[differences[0]]);
  }
  const [short, long] = a.length < b.length ? [a, b] : [b, a];
  for (let index = 0; index < long.length; index++) if (long.slice(0, index) + long.slice(index + 1) === short) return true;
  return false;
}
const phraseIndex = faqs.map((faq) => ({ id: faq.id, phrases: [faq.question, ...faq.aliases, ...(languageAliases[faq.id] || [])] }));
function matchOne(text) {
  // Exact supplied aliases may safely answer a bounded question (e.g. refund policy).
  const exact = phraseIndex.find((entry) => entry.phrases.some((phrase) => cleanText(phrase) === cleanText(text)));
  if (exact) return { status: 'matched', ids: [exact.id], via: 'local' };
  if (isUnsupported(text)) return { status: 'unknown', ids: [], via: 'local' };
  // Do not let the legacy ASCII normalizer discard Hindi words and match a leftover token.
  if (!/[^\p{Script=Latin}\p{N}\p{P}\p{Z}\p{S}\s]/u.test(text)) {
    const legacy = findAnswer(text);
    if (legacy.kind === 'verified') return { status: 'matched', ids: [legacy.faq.id], via: 'local' };
  }
  const words = phraseTokens(text);
  if (!words.length) return { status: 'clarify', ids: [], via: 'local' };
  const candidates = words.length ? phraseIndex.filter((entry) => entry.phrases.some((phrase) => {
    const targets = phraseTokens(phrase);
    return words.every((word) => targets.some((target) => closeWord(word, target)));
  })) : [];
  if (candidates.length === 1) return { status: 'matched', ids: [candidates[0].id], via: 'local' };
  return { status: 'needs_llm', ids: [], via: 'local' };
}

export function localMatch(question) {
  if (typeof question !== 'string' || !question.trim() || question.length > MAX_QUESTION_LENGTH) return { parts: [], code: 'invalid_question' };
  if (isInstructionAttack(question)) return { parts: [{ part_id: 'p0', text: question.trim(), status: 'unknown', ids: [], via: 'local' }], mode: 'local' };
  const text = redactQuestion(question.trim());
  // Preserve complete known phrases before splitting conjunctions such as RAG and agents.
  const exact = phraseIndex.find((entry) => entry.phrases.some((phrase) => cleanText(phrase) === cleanText(text)));
  if (exact) return { parts: [{ part_id: 'p0', text, status: 'matched', ids: [exact.id], via: 'local' }], mode: 'local' };
  let segments = text.split(/[?!.।;\n]+|\s+(?:and|aur|और)\s+/iu).map((part) => part.trim()).filter(Boolean);
  segments = segments.filter((part) => !/^(?:i am|i'm) (?:a |an )?(?:student|fresher|business owner|freelancer)$/i.test(part));
  if (!segments.length || segments.length > MAX_PARTS) return { parts: [{ part_id: 'p0', text, status: 'clarify', ids: [], via: 'local' }], mode: 'local' };
  return { parts: segments.map((part, index) => ({ part_id: `p${index}`, text: part, ...matchOne(part) })), mode: 'local' };
}

export function permittedIds(text) {
  const groups = [
    [/\b(?:price|fees?|cost|gst|keemat|kimat)\b|फीस|कीमत/iu, ['KB009']],
    [/\b(?:coding|code|beginner|codding)\b|कोडिंग/iu, ['KB003']],
    [/\b(?:fresher|freshers|audience|students?)\b|फ्रेशर|छात्र/iu, ['KB002']],
    [/\b(?:rag|mcp|agents?|syllabus|curriculum|topics)\b|आरएजी|पाठ्यक्रम/iu, ['KB004']],
    [/\b(?:access|validity|forever|lifetime|expire)\b|वैधता|एक्सेस/iu, ['KB008']],
    [/\b(?:certificate|certification)\b|सर्टिफिकेट/iu, ['KB012']],
    [/\b(?:community|sahil)\b|कम्युनिटी/iu, ['KB011']],
    [/\b(?:live|self.paced|scheduled|recorded|timetable)|own schedule|apni speed|अपने समय|टाइमटेबल/iu, ['KB007']],
    [/\b(?:refund)\b/iu, ['KB013']],
  ];
  return new Set(groups.filter(([pattern]) => pattern.test(text)).flatMap(([, ids]) => ids));
}

export function validateModelResult(payload, pendingParts) {
  if (!payload || Object.keys(payload).some((key) => key !== 'parts') || !Array.isArray(payload.parts) || payload.parts.length !== pendingParts.length) throw new Error('invalid_model_result');
  const result = new Map();
  for (const part of payload.parts) {
    const original = pendingParts.find((entry) => entry.part_id === part?.part_id);
    if (!original || result.has(part.part_id) || Object.keys(part).some((key) => !['part_id', 'status', 'ids', 'confidence', 'unknown_fragments'].includes(key))) throw new Error('invalid_model_result');
    if (!['matched', 'unknown', 'clarify'].includes(part.status) || !['high', 'low'].includes(part.confidence) || !Array.isArray(part.ids) || part.ids.length > 3 || new Set(part.ids).size !== part.ids.length || !part.ids.every((id) => typeof id === 'string' && byId.has(id))) throw new Error('invalid_model_result');
    const fragments = part.unknown_fragments;
    if (!Array.isArray(fragments) || fragments.length > 3 || fragments.some((fragment) => typeof fragment !== 'string' || fragment.length < 2 || fragment.length > 180 || !original.text.toLowerCase().includes(fragment.toLowerCase()))) throw new Error('invalid_model_result');
    if (part.status === 'matched' ? part.ids.length === 0 : part.ids.length !== 0) throw new Error('invalid_model_result');
    const allowed = permittedIds(original.text);
    if (part.status === 'matched' && (isUnsupported(original.text) || (allowed.size && part.ids.some((id) => !allowed.has(id))))) throw new Error('irrelevant_model_ids');
    result.set(part.part_id, { ...original, status: part.confidence === 'low' ? 'clarify' : part.status, ids: part.confidence === 'low' ? [] : part.ids, unknown_fragments: fragments, via: 'gemini' });
  }
  return result;
}

// The client validates again and renders KB records by ID; it never renders API prose.
export function validateApiResult(payload, question) {
  const local = localMatch(question);
  if (!payload || !Array.isArray(payload.parts) || payload.parts.length !== local.parts.length) throw new Error('invalid_api_result');
  const parts = local.parts.map((original) => {
    const item = payload.parts.find((part) => part.part_id === original.part_id);
    if (!item || !['matched', 'unknown', 'clarify'].includes(item.status) || !Array.isArray(item.ids) || item.ids.length > 3 || !item.ids.every((id) => byId.has(id))) throw new Error('invalid_api_result');
    const fragments = item.unknown_fragments || [];
    if (!Array.isArray(fragments) || fragments.some((fragment) => typeof fragment !== 'string' || !original.text.toLowerCase().includes(fragment.toLowerCase()))) throw new Error('invalid_api_result');
    if (item.status === 'matched' ? !item.ids.length : item.ids.length) throw new Error('invalid_api_result');
    if (original.status !== 'needs_llm' && (item.status !== original.status || JSON.stringify(item.ids) !== JSON.stringify(original.ids))) throw new Error('invalid_api_result');
    const allowed = permittedIds(original.text);
    if (item.status === 'matched' && allowed.size && item.ids.some((id) => !allowed.has(id))) throw new Error('invalid_api_result');
    return { ...original, status: item.status, ids: item.ids, unknown_fragments: fragments, via: item.via === 'gemini' ? 'gemini' : 'local' };
  });
  return { parts, mode: parts.some((part) => part.via === 'gemini') ? 'hybrid' : 'local', code: ['not_configured', 'disabled', 'timeout', 'rate_limited', 'network_error', 'provider_error', 'invalid_model_result', 'busy'].includes(payload.code) ? payload.code : undefined };
}

export async function askQuestion(question, { fetchImpl = fetch, signal } = {}) {
  const local = localMatch(question);
  if (!local.parts.length || !local.parts.some((part) => part.status === 'needs_llm')) return local;
  try {
    const response = await fetchImpl('/api/faq', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: redactQuestion(question) }), signal: signal || AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(response.status === 429 ? 'rate_limited' : 'network_error');
    return validateApiResult(await response.json(), question);
  } catch (error) {
    if (signal?.aborted && signal.reason?.name !== 'TimeoutError') throw error;
    const code = ['TimeoutError', 'AbortError'].includes(error.name) ? 'timeout' : error.message === 'rate_limited' ? 'rate_limited' : 'network_error';
    return { ...local, parts: local.parts.map((part) => part.status === 'needs_llm' ? { ...part, status: 'unknown' } : part), code };
  }
}
