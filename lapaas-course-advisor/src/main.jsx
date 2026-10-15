import React, { useReducer, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { categoryLabel, faqs, knowledgeBase } from './faq.js';
import { assessmentReducer, initialAssessment } from './assessment.js';
import Discovery from './Discovery.jsx';
import { Icon, OfficialLink, FaqSource } from './ui.jsx';
import FaqChat from './FaqChat.jsx';
import './styles.css';

const courseBenefits = [
  { id: 'KB005', title: 'Build practical AI skills', icon: 'book' },
  { id: 'KB007', title: 'Learn at your own pace', icon: 'clock' },
  { id: 'KB011', title: 'Connect with the community', icon: 'community' },
].map((benefit) => ({ ...benefit, fact: faqs.find((faq) => faq.id === benefit.id) }));

const topicGroups = [
  { id: 'essentials', label: 'Course essentials', ids: ['KB001', 'KB002', 'KB003', 'KB004'] },
  { id: 'learning', label: 'Learning & outcomes', ids: ['KB005', 'KB006', 'KB012', 'KB016'] },
  { id: 'experience', label: 'How it works', ids: ['KB007', 'KB008', 'KB010', 'KB011', 'KB015'] },
  { id: 'fees', label: 'Fees & policies', ids: ['KB009', 'KB013', 'KB014'] },
];

function AnswerContent({ faq }) {
  return <><p className="answer">{faq.answer}</p>
    {faq.limitation && <p className="limitation"><Icon name="info" size={16} /><span>{faq.limitation}</span></p>}
    <FaqSource faq={faq} />
  </>;
}

function AnswerCard({ faq, featured = false }) {
  return <article className={`answer-card ${featured ? 'featured' : ''}`}>
    <div className="card-meta"><span>{categoryLabel(faq.category)}</span><span className="verified"><Icon name="check" size={14} />Verified course information</span></div>
    <h3>{faq.question}</h3><AnswerContent faq={faq} />
  </article>;
}

function FaqLibrary() {
  const [group, setGroup] = useState('all');
  const [openId, setOpenId] = useState(null);
  const visibleGroups = topicGroups.filter((item) => group === 'all' || item.id === group);
  return <section className="faq-library" aria-labelledby="library-title">
    <div className="library-heading"><div><span className="section-caption">THE DETAILS, SIMPLIFIED</span><h2 id="library-title">A little clarity goes a long way.</h2><p>Browse the questions that matter to you.</p></div><span className="library-count">{faqs.length} sourced answers</span></div>
    <nav className="topic-filters" aria-label="Filter questions">
      {[{ id: 'all', label: 'All questions' }, ...topicGroups].map((item) => <button key={item.id} aria-pressed={group === item.id} onClick={() => { setGroup(item.id); setOpenId(null); }}>{item.label}</button>)}
    </nav>
    <div className="faq-groups">{visibleGroups.map((item) => <section className="faq-group" key={item.id} aria-labelledby={`group-${item.id}`}>
      <h3 id={`group-${item.id}`}>{item.label}</h3>
      <div className="faq-list">{item.ids.map((id) => {
        const faq = faqs.find((entry) => entry.id === id);
        const open = openId === id;
        return <article className={`faq-item ${open ? 'is-open' : ''}`} key={id} data-kb-id={id}>
          <h4><button id={`question-${id}`} aria-expanded={open} aria-controls={`answer-${id}`} onClick={() => setOpenId(open ? null : id)}><span>{faq.question}</span><Icon name="plus" size={18} /></button></h4>
          <div className="faq-answer" id={`answer-${id}`} role="region" aria-labelledby={`question-${id}`} hidden={!open}><AnswerContent faq={faq} /></div>
        </article>;
      })}</div>
    </section>)}</div>
  </section>;
}

function App() {
  const [view, setView] = useState('faq');
  const [assessment, dispatch] = useReducer(assessmentReducer, initialAssessment);
  const checkedDate = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${knowledgeBase.metadata.verified_on}T00:00:00Z`));

  function openFAQs() {
    setView('faq');
    requestAnimationFrame(() => { document.getElementById('page-title')?.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'instant' }); });
  }

  return <>
    <a className="skip-link" href="#main">Skip to main content</a>
    <div className="prototype-banner">Independent internship prototype · Not an official Lapaas website</div>
    <header className="site-header"><div className="header-inner">
      <a href="#main" className="brand" onClick={openFAQs}><span className="brand-mark">L<span>.</span></span><span>Lapaas<span className="brand-subtitle">Course discovery</span></span></a>
      <div className="header-right"><nav className="module-nav" aria-label="Application sections"><button aria-pressed={view === 'faq'} onClick={openFAQs}>Course FAQs</button><button aria-pressed={view === 'discovery'} onClick={() => setView('discovery')}>Learning Path</button></nav><OfficialLink className="official-link">Official course</OfficialLink></div>
    </div></header>
    <div className="workspace"><main id="main">
      <div hidden={view !== 'faq'}>
        <div className="hero-layout">
          <section className="intro" aria-labelledby="page-title">
            <div className="eyebrow"><span /> FOR STUDENTS & FRESHERS</div>
            <h1 id="page-title" tabIndex={-1}>Your next step in AI.<br /><span>A little more clear.</span></h1>
            <p>Get to know Lapaas AI Product Engineering.<br className="desktop-break" /> Explore the course, ask a question, find your direction.</p>
            <div className="intro-meta"><Icon name="shield" size={15} /><span>Course information checked {checkedDate}</span></div>
          </section>
          <section className="launch-panel" aria-labelledby="path-title"><span className="path-icon"><Icon name="route" size={23} /></span><span className="section-caption">START WITH YOU</span><h2 id="path-title">Where could AI take you?</h2><p>Six questions. A learning direction based on your goals.</p><button className="primary-action" onClick={() => setView('discovery')}>Find My Learning Path<Icon name="arrow" size={17} /></button><small>No login needed · Rule-based guidance</small></section>
        </div>
        <FaqChat AnswerCard={AnswerCard} />
        <section className="course-benefits" aria-labelledby="benefits-title"><h2 id="benefits-title" className="sr-only">Three verified course benefits</h2><div className="benefit-grid">{courseBenefits.map(({ id, title, icon, fact }) => <article className="course-benefit" key={id} data-kb-id={id}><Icon name={icon} size={21} /><h3>{title}</h3><p>{fact.answer}</p><details className="benefit-details"><summary>Course source</summary><FaqSource faq={fact} benefit /></details></article>)}</div></section>
        <FaqLibrary />
        <section className="bottom-cta" aria-label="Explore your learning direction"><div><h2>Know the course. Find your direction.</h2><p>Connect what you have learned with your own goals.</p></div><button className="secondary-action" onClick={() => setView('discovery')}>Explore my learning path<Icon name="arrow" size={17} /></button></section>
      </div>
      {view === 'discovery' && <Discovery state={assessment} dispatch={dispatch} onFAQ={openFAQs} />}
      <div className="source-notice"><Icon name="info" size={17} /><p>Based on public course information checked {checkedDate}. Price, access and policies can change. Confirm current terms on the official course page before paying.</p></div>
      <footer><span>Built by Anish Kumar · Lapaas AI Internship</span><OfficialLink>Explore the official course</OfficialLink></footer>
    </main></div>
  </>;
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
