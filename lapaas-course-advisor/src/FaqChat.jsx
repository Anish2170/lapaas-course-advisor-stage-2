import React, { useEffect, useRef, useState } from 'react';
import { askQuestion, byId, MAX_QUESTION_LENGTH } from './faq-hybrid.js';
import { knowledgeBase } from './faq.js';
import { Icon, OfficialLink } from './ui.jsx';

const errors = {
  not_configured: 'Gemini matching is not configured yet. Local FAQ matching still works.',
  disabled: 'Gemini matching is switched off. Local FAQ matching still works.',
  timeout: 'Intent matching took too long. Please try a shorter question or browse the FAQs.',
  rate_limited: 'Intent matching is busy or its request limit was reached. Please wait and try again.',
  busy: 'Intent matching is busy. Please wait a moment and try again.',
  network_error: 'Intent matching is temporarily unavailable. You can still browse the verified FAQs.',
  provider_error: 'Gemini could not process this request. Please try later or browse the verified FAQs.',
  invalid_model_result: 'The AI match could not be validated. No unverified answer has been used.',
};

function Unknown({ parts, clarify = false }) {
  return <article className="unknown-card"><div className="unknown-icon"><Icon name="info" size={23} /></div><div><span className="unknown-label">{clarify ? 'PLEASE CLARIFY YOUR QUESTION' : 'NOT VERIFIED IN THIS KNOWLEDGE BASE'}</span><h3>{clarify ? 'Could you ask one specific course question?' : 'I can’t confirm that detail.'}</h3><p>{knowledgeBase.unknown_answer}</p>{parts.length > 0 && <div className="unverified-parts"><strong>{clarify ? 'Please clarify:' : 'Unverified part(s):'}</strong><ul>{parts.map((text, index) => <li key={index}>“{text}”</li>)}</ul></div>}<p className="unknown-explanation">This doesn’t mean it isn’t offered. Check with Lapaas for clarification.</p><OfficialLink className="unknown-link" /></div></article>;
}

function Turn({ turn, latest, AnswerCard }) {
  const ids = [...new Set(turn.result?.parts?.flatMap((part) => part.ids) || [])];
  const unknown = turn.result?.parts?.filter((part) => part.status !== 'matched').map((part) => part.text) || [];
  const fragments = turn.result?.parts?.flatMap((part) => part.unknown_fragments || []) || [];
  return <div className={latest ? 'search-result chat-turn' : 'chat-turn past-turn'}>
    <div className="chat-user"><span className="chat-speaker">YOU</span><div className="result-heading"><h2>{turn.question}</h2></div></div>
    <div className="chat-assistant"><div className="chat-assistant-label"><span className="chat-avatar"><Icon name="book" size={15} /></span><span>Course FAQ Assistant</span><small>{turn.loading ? 'Finding a verified match…' : turn.result?.mode === 'hybrid' ? 'Intent checked with Gemini · KB answers' : 'Checked locally · KB answers'}</small></div>
      {turn.loading ? <div className="chat-loading" role="status"><span className="loading-dots" aria-hidden="true">•••</span> Checking your question against verified information…</div> : <>
        {turn.result?.code && <p className="chat-error" role="status">{errors[turn.result.code] || 'Please ask a shorter, specific question.'}</p>}
        {ids.map((id) => <AnswerCard key={id} faq={byId.get(id)} featured />)}
        {(unknown.length > 0 || fragments.length > 0 || !ids.length) && <Unknown parts={[...unknown, ...fragments]} clarify={turn.result?.parts?.some((part) => part.status === 'clarify')} />}
      </>}
    </div>
  </div>;
}

export default function FaqChat({ AnswerCard }) {
  const [query, setQuery] = useState('');
  const [turns, setTurns] = useState([]);
  const [configured, setConfigured] = useState(false);
  const inputRef = useRef(null);
  const controllerRef = useRef(null);
  const generation = useRef(0);
  const loading = Boolean(turns.at(-1)?.loading);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/health', { signal: controller.signal }).then((response) => response.ok ? response.json() : null).then((data) => setConfigured(data?.geminiConfigured === true)).catch(() => {});
    return () => { controller.abort(); controllerRef.current?.abort(); };
  }, []);

  async function search(value) {
    if (!value.trim()) return;
    if (value.length > MAX_QUESTION_LENGTH || loading) return;
    controllerRef.current?.abort();
    const controller = new AbortController(); controllerRef.current = controller;
    const id = ++generation.current;
    setQuery(value);
    setTurns((previous) => [...previous.slice(-19), { id, question: value.trim(), loading: true }]);
    try {
      // Client deadline is separate from the backend/provider deadline.
      const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]);
      const result = await askQuestion(value.trim(), { signal });
      if (id !== generation.current) return;
      setTurns((previous) => previous.map((turn) => turn.id === id ? { ...turn, loading: false, result } : turn));
    } catch (error) {
      if (controller.signal.aborted || id !== generation.current) return;
      setTurns((previous) => previous.map((turn) => turn.id === id ? { ...turn, loading: false, result: { parts: [], code: 'timeout' } } : turn));
    }
  }
  function clear() {
    generation.current++; controllerRef.current?.abort(); setTurns([]); setQuery(''); inputRef.current?.focus();
  }
  const latest = turns.at(-1);
  return <div className="faq-chat">
    <section className="search-panel" aria-label="Ask a course question">
      <div className="chat-panel-heading"><span className="section-caption">ASK IN YOUR OWN WORDS</span><span className="chat-service-status">{configured ? 'Gemini enabled for unfamiliar questions' : 'Local matching available'}</span></div>
      <form onSubmit={(event) => { event.preventDefault(); search(query); }}>
        <label htmlFor="question">What would you like to know?</label>
        <div className="search-row"><Icon name="search" size={21} /><input ref={inputRef} id="question" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ask in English, Hindi or Hinglish…" aria-describedby="search-help" maxLength={MAX_QUESTION_LENGTH} /><button type="submit" className="search-button" disabled={loading}>{loading ? 'Matching…' : 'Find answer'}<Icon name="arrow" size={17} /></button></div>
      </form>
      <p id="search-help">Try English, हिंदी or Hinglish. Please avoid personal details. Unfamiliar phrasing may be sent to Gemini; course answers always come from the verified knowledge base.</p>
      <div className="suggestions"><span>TRY ASKING</span>{['What is the course price?', 'Can I join without coding?', 'Is access lifetime?'].map((question) => <button key={question} disabled={loading} onClick={() => search(question)}>{question}<Icon name="arrow" size={13} /></button>)}</div>
    </section>
    {latest && <section className="chat-conversation" aria-label="Search result" aria-live="polite" aria-atomic="false">
      <div className="chat-controls"><span>Answers sourced from course facts · checked {knowledgeBase.metadata.verified_on}</span><button className="clear-button" onClick={clear} aria-label="Clear search"><Icon name="close" size={16} />Clear chat</button></div>
      <Turn turn={latest} latest AnswerCard={AnswerCard} />
      {turns.length > 1 && <details className="chat-history"><summary>Earlier messages ({turns.length - 1})</summary>{turns.slice(0, -1).map((turn) => <Turn key={turn.id} turn={turn} AnswerCard={AnswerCard} />)}</details>}
    </section>}
    <p className="chat-memory-note">Questions are independent: previous messages and assessment answers are never sent to Gemini. Chat stays in this tab’s memory and clears on reload.</p>
  </div>;
}
