import React, { useEffect, useRef } from 'react';
import { questions, getQuestion, isValidAnswer, answerLabel, recommend } from './assessment.js';
import { knowledgeBase } from './faq.js';
import { Icon, OfficialLink } from './ui.jsx';

function Fact({ faq }) {
  return <div className="discovery-fact"><p>{faq.answer}</p>{faq.limitation && <small>{faq.limitation}</small>}<a href={faq.source_url} target="_blank" rel="noopener noreferrer">{faq.source_section}<Icon name="external" size={12} /></a>{faq.secondary_source_url && <a href={faq.secondary_source_url} target="_blank" rel="noopener noreferrer">Refund eligibility terms<Icon name="external" size={12} /></a>}</div>;
}

function Recommendation({ answers, dispatch, onFAQ, titleRef }) {
  const result = recommend(answers);
  if (!result) return <div className="assessment-panel"><h1 ref={titleRef} tabIndex={-1}>Complete your answers first</h1><button className="primary-action" onClick={() => dispatch({ type: 'edit' })}>Return to assessment</button></div>;
  return <div className="recommendation screen-enter" data-suitability={result.suitability.kind}>
    <div className="eyebrow"><span /> YOUR PERSONAL LEARNING DIRECTION</div>
    <h1 ref={titleRef} tabIndex={-1}>A starting point.<br /><span>With the details that matter.</span></h1>
    <p className="discovery-lead">Rule-based guidance from your six answers and the supplied course facts. This is a learning suggestion, not a proficiency assessment.</p>
    <div className={`suitability-card suitability-${result.suitability.kind}`}><div className="suitability-symbol"><Icon name={['pause', 'clarify', 'review'].includes(result.suitability.kind) ? 'info' : 'book'} size={24} /></div><div><span className="section-caption">COURSE SUITABILITY · CONDITIONAL GUIDANCE</span><h2>{result.suitability.title}</h2><p>{result.suitability.explanation}</p></div></div>
    <section className="profile-panel" aria-labelledby="profile-heading"><div className="dashboard-heading"><h2 id="profile-heading">Your profile summary</h2><button className="text-action" onClick={() => dispatch({ type: 'edit' })}>Edit answers<Icon name="arrow" size={14} /></button></div><dl className="profile-grid">{result.profile.map((item) => <div key={item.id}><dt>{item.label}</dt><dd>{item.answer}</dd></div>)}</dl><div className="main-goal"><span>MAIN GOAL</span><strong>{result.goal}</strong></div></section>

    <section aria-labelledby="topics-heading"><div className="dashboard-heading"><div><span className="section-caption">CONNECT YOUR GOAL TO THE CURRICULUM</span><h2 id="topics-heading">Topics worth exploring</h2></div><span className="dashboard-count">{result.topics.length} areas</span></div><p className="section-description">Topic names are sourced from the supplied published-curriculum mapping. The order and relevance explanations below are our suggested guidance.</p><div className="topic-grid">{result.topics.map((topic, index) => <article className="topic-card" key={topic.id} data-topic={topic.id}><div className="topic-topline"><span>{String(index + 1).padStart(2, '0')}</span><span>Published curriculum</span></div><h3>{topic.title}</h3><p className="published-skill">Listed area: {topic.publishedSkill}</p><h4>Why it relates to your answers</h4><ul>{topic.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul><a className="topic-source" href={topic.sourceUrl} target="_blank" rel="noopener noreferrer">Official curriculum · supplied map<Icon name="external" size={13} /></a></article>)}</div></section>

    <section className="project-card" aria-labelledby="project-heading"><div className="project-symbol"><Icon name="book" size={28} /></div><div><span className="section-caption">{result.project.label}</span><h2 id="project-heading">{result.project.title}</h2><p>{result.project.description}</p><small>This is an illustrative idea. It is not a promised included project, completion outcome or evidence of job readiness. Tools or APIs you choose may have separate costs.</small></div></section>

    <section className="considerations" aria-labelledby="considerations-heading"><div className="dashboard-heading"><div><span className="section-caption">READ BEFORE YOU DECIDE</span><h2 id="considerations-heading">Important considerations</h2></div></div><div className="consideration-list">{result.considerations.map((item) => <article key={item.id} data-consideration={item.id}><Icon name="info" size={19} /><div><h3>{item.title}</h3><p>{item.text}</p><details><summary>View supporting course facts</summary>{item.facts.map((faq) => <Fact faq={faq} key={faq.id} />)}</details></div></article>)}</div></section>

    <section className="decision-facts" aria-label="Verified details to check"><div className="dashboard-heading"><h2>Keep these verified details in view</h2></div><div className="decision-facts-grid">{result.facts.map((faq) => <Fact key={faq.id} faq={faq} />)}</div></section>
    <section className="next-step" aria-labelledby="next-step-heading"><div><span className="section-caption">YOUR RECOMMENDED NEXT STEP</span><h2 id="next-step-heading">Make an informed decision.</h2><p>{result.suitability.nextStep}</p></div><div className="next-actions"><OfficialLink className="primary-action">Visit Official Course Page</OfficialLink><button className="secondary-action" onClick={onFAQ}>Explore Verified FAQs<Icon name="arrow" size={16} /></button></div></section>
    <div className="discovery-bottom"><span>Course data checked {knowledgeBase.metadata.verified_on}. Confirm current terms before payment.</span><button className="text-action" onClick={() => dispatch({ type: 'restart' })}>Start over</button></div>
  </div>;
}

export default function Discovery({ state, dispatch, onFAQ }) {
  const titleRef = useRef(null);
  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [state.step, state.complete]);
  if (state.complete) return <Recommendation answers={state.answers} dispatch={dispatch} onFAQ={onFAQ} titleRef={titleRef} />;
  const question = getQuestion(questions[state.step].id, state.answers);
  const selected = state.answers[question.id];
  const validSelection = isValidAnswer(question.id, selected, state.answers);
  return <section className="discovery-view" aria-label="Course discovery assessment">
    <div className="eyebrow"><span /> SIX QUESTIONS. A CLEARER DIRECTION.</div>
    <div className="discovery-topline"><span>COURSE DISCOVERY ASSESSMENT</span><span>Step {state.step + 1} of {questions.length}</span></div>
    <progress className="assessment-progress" aria-label="Assessment progress" max={questions.length} value={state.step + 1} />
    <form className="assessment-panel screen-enter" key={question.id} onSubmit={(event) => { event.preventDefault(); dispatch({ type: 'next' }); }}>
      <div className="step-number">{String(state.step + 1).padStart(2, '0')}<span> / 06</span></div>
      <h1 id="assessment-question" ref={titleRef} tabIndex={-1}>{question.title}</h1>
      <p id="assessment-helper">{question.helper}</p>
      {['goal', 'interest', 'concern'].includes(question.id) && <p className="adaptive-context">{question.id === 'goal' && state.answers.goalScope === 'other' ? 'Exploring alternative supported goals. Choose the one that fits you.' : `Options tailored to ${answerLabel('role', state.answers.role, state.answers)}${question.id === 'interest' ? ` · ${answerLabel('goal', state.answers.goal, state.answers)}` : ''}.`}</p>}
      {state.notice && <p className="adaptive-notice" role="status">{state.notice}</p>}
      <fieldset className="assessment-options" aria-labelledby="assessment-question" aria-describedby="assessment-helper"><legend className="sr-only">{question.title}</legend>{question.options.map((option) => <label key={option.value} className={`assessment-option ${selected === option.value ? 'selected' : ''}`}><input type="radio" name={question.id} value={option.value} checked={selected === option.value} onChange={() => dispatch({ type: 'select', value: option.value })} /><span>{option.label}</span><Icon name="check" size={17} /></label>)}</fieldset>
      {question.id === 'goal' && <div className="other-goals"><button className="text-action" type="button" aria-pressed={state.answers.goalScope === 'other'} onClick={() => dispatch({ type: 'goal-scope', value: state.answers.goalScope === 'other' ? 'role' : 'other' })}>{state.answers.goalScope === 'other' ? 'Back to role-based goals' : 'Explore Other Goals'}<Icon name="arrow" size={14} /></button><small>Your background does not limit what you can explore.</small></div>}
      <div className="assessment-navigation"><button type="button" className="secondary-action back-action" disabled={state.step === 0} onClick={() => dispatch({ type: 'back' })}><Icon name="arrow" size={16} />Back</button><span className="selection-hint">{validSelection ? 'You can change this later.' : 'Choose one option to continue.'}</span><button className="primary-action" type="submit" disabled={!validSelection}>{state.step === questions.length - 1 ? 'See My Learning Path' : 'Next'}<Icon name="arrow" size={16} /></button></div>
    </form>
    <div className="assessment-footnote"><Icon name="shield" size={18} /><p>No login or contact details. Answers stay in memory in this browser tab and are cleared on reload. No personal information is sent to external services.</p></div>
    <button className="text-action assessment-faq" onClick={onFAQ}>Browse verified course FAQs<Icon name="arrow" size={15} /></button>
  </section>;
}
