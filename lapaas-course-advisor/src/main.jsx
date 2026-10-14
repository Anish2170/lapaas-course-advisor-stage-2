import React, { useReducer, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { categories, categoryLabel, faqs, knowledgeBase } from './faq.js';
import { assessmentReducer, initialAssessment, questions } from './assessment.js';
import Discovery from './Discovery.jsx';
import { Icon, OfficialLink, FaqSource } from './ui.jsx';
import FaqChat from './FaqChat.jsx';
import './styles.css';

const courseBenefits = [
  { id: 'KB005', title: 'Learn AI application workflows' },
  { id: 'KB007', title: 'Study at your own pace' },
  { id: 'KB011', title: 'Ask questions in the community' },
].map((benefit) => ({ ...benefit, fact: faqs.find((faq) => faq.id === benefit.id) }));

function AnswerCard({ faq, featured = false }) {
  return <article className={`answer-card ${featured ? 'featured' : ''}`}>
    <div className="card-meta"><span>{categoryLabel(faq.category)}</span><span className="verified"><Icon name="check" size={13} />Verified in supplied KB</span></div>
    <h3>{faq.question}</h3>
    <p className="answer">{faq.answer}</p>
    {faq.limitation && <p className="limitation"><Icon name="info" size={15} /><span>{faq.limitation}</span></p>}
    <FaqSource faq={faq} />
    {faq.secondary_source_url && <a className="policy-link" href={faq.secondary_source_url} target="_blank" rel="noopener noreferrer">Read refund eligibility terms<Icon name="external" size={13} /></a>}
  </article>;
}

function App() {
  const [view, setView] = useState('faq');
  const [assessment, dispatch] = useReducer(assessmentReducer, initialAssessment);
  const [category, setCategory] = useState('all');
  const filtered = category === 'all' ? faqs : faqs.filter((faq) => faq.category === category);
  const checkedDate = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${knowledgeBase.metadata.verified_on}T00:00:00Z`));

  function openFAQs() {
    setView('faq');
    requestAnimationFrame(() => { document.getElementById('page-title')?.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'instant' }); });
  }

  return <>
    <a className="skip-link" href="#main">Skip to main content</a>
    <div className="prototype-banner">Independent internship prototype - not an official Lapaas website</div>
    <header className="site-header">
      <a href="#main" className="brand" onClick={openFAQs}><span className="brand-mark">L<span>.</span></span><span>Lapaas<span className="brand-subtitle">COURSE DISCOVERY</span></span></a>
      <div className="header-right"><nav className="module-nav" aria-label="Application sections"><button className={view === 'discovery' ? 'selected' : ''} aria-pressed={view === 'discovery'} onClick={() => setView('discovery')}>Learning Path</button><button className={view === 'faq' ? 'selected' : ''} aria-pressed={view === 'faq'} onClick={openFAQs}>Verified FAQs</button></nav><OfficialLink className="official-link">Official course<Icon name="arrow" size={16} /></OfficialLink></div>
    </header>

    <div className="workspace">
      <aside className="sidebar" aria-label={view === 'faq' ? 'FAQ categories' : 'Assessment steps'}>
        {view === 'faq' ? <>
        <div className="sidebar-heading"><Icon name="book" size={18} /><h2>Knowledge base</h2></div>
        <p className="sidebar-description">A clearer starting point for<br />students & freshers.</p>
        <p className="section-caption">BROWSE BY TOPIC</p>
        <nav className="category-list" aria-label="Filter questions">
          {['all', ...categories].map((item) => <button key={item} className={category === item ? 'category active' : 'category'} aria-pressed={category === item} onClick={() => setCategory(item)}><span>{item === 'all' ? 'All questions' : categoryLabel(item)}</span><span className="count">{item === 'all' ? faqs.length : faqs.filter((faq) => faq.category === item).length}</span></button>)}
        </nav>
        <div className="sidebar-note"><Icon name="shield" size={22} /><strong>Sources over assumptions.</strong><p>Every answer comes from the supplied public-course knowledge base.</p></div>
        </> : <><div className="sidebar-heading"><Icon name="book" size={18} /><h2>Your learning path</h2></div><p className="sidebar-description">A few details about you.<br />A more useful starting point.</p><ol className="step-list" aria-label="Your progress">{questions.map((question, index) => <li key={question.id} className={assessment.complete || index < assessment.step ? 'done' : index === assessment.step ? 'current' : ''} aria-current={!assessment.complete && index === assessment.step ? 'step' : undefined}><span>{assessment.complete || index < assessment.step ? <Icon name="check" size={12} /> : index + 1}</span>{question.short}</li>)}</ol><div className="sidebar-note"><Icon name="shield" size={22} /><strong>Guidance, with context.</strong><p>Verified course facts. Suggested learning directions. Honest limitations.</p></div><button className="text-action sidebar-faq" onClick={openFAQs}>Browse course questions<Icon name="arrow" size={14} /></button></>}
      </aside>

      <main id="main">
        <div hidden={view !== 'faq'}>
        <section className="intro" aria-labelledby="page-title">
          <div className="eyebrow"><span /> YOUR QUESTIONS, GROUNDED IN SOURCES</div>
          <h1 id="page-title" tabIndex={-1}>Get to know the course.<br /><span>Before you take the next step.</span></h1>
          <p>Explore what Lapaas AI Product Engineering teaches, how it works,<br className="desktop-break" /> and the details worth checking before you enrol.</p>
          <div className="intro-meta"><span><Icon name="book" size={15} />{faqs.length} sourced answers</span><span className="meta-divider" /><span>KB checked {checkedDate}</span></div>
        </section>

        <section className="launch-panel" aria-label="Find your learning path"><div><span className="section-caption">START WITH YOUR GOALS</span><h2>What could your learning path look like?</h2><p>Six questions to connect your background, interests and study time with verified course information.</p></div><div><button className="primary-action" onClick={() => setView('discovery')}>Find My Learning Path<Icon name="arrow" size={17} /></button><small>Rule-based guidance · No login needed</small></div></section>

        <section className="course-benefits" aria-labelledby="benefits-title"><div className="library-heading"><div><div className="section-caption">THREE VERIFIED COURSE BENEFITS</div><h2 id="benefits-title">What the published course offers</h2></div></div><div className="benefit-grid">{courseBenefits.map(({ id, title, fact }) => <article className="course-benefit" key={id} data-kb-id={id}><Icon name="check" size={18} /><h3>{title}</h3><p>{fact.answer}</p><FaqSource faq={fact} benefit /></article>)}</div><p className="benefits-note">Self-paced study still requires practice. Community access does not establish private mentoring. Check current terms on the official page.</p></section>

        <FaqChat AnswerCard={AnswerCard} />

        <section className="faq-library" aria-labelledby="library-title"><div className="library-heading"><div><div className="section-caption">THE COURSE, EXPLAINED</div><h2 id="library-title">{category === 'all' ? 'Browse all questions' : categoryLabel(category)}</h2></div><span>{filtered.length} {filtered.length === 1 ? 'answer' : 'answers'}</span></div><div className="faq-grid">{filtered.map((faq) => <AnswerCard key={faq.id} faq={faq} />)}</div></section>
        </div>
        {view === 'discovery' && <Discovery state={assessment} dispatch={dispatch} onFAQ={openFAQs} />}
        <div className="source-notice"><Icon name="info" size={18} /><p>These are dated public-course facts, not live course terms. Price, access and policies may change. Confirm current details on the official page before paying.</p></div>
        <footer><span>Built by Anish Kumar · Lapaas AI Internship</span><span>Grounded FAQ chat & Course Discovery · Milestone 03</span></footer>
      </main>
    </div>
  </>;
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
