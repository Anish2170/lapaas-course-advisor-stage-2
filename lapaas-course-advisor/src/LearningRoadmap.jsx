import React from 'react';
import { FaqSource } from './ui.jsx';

export default function LearningRoadmap({ roadmap }) {
  return <section className="learning-roadmap" aria-labelledby="roadmap-heading">
    <div className="dashboard-heading"><div><span className="section-caption">A PLAN TO ADAPT, NOT A DEADLINE TO FINISH</span><h2 id="roadmap-heading">Your Personalized 3-Month Learning Roadmap</h2></div></div>
    <p className="section-description">{roadmap.introduction}</p>
    <p className="roadmap-disclaimer">{roadmap.disclaimer}</p>
    <aside className="roadmap-pace" aria-label="Study time and course access">
      <h3>{roadmap.time.title}</h3><p>{roadmap.time.text}</p>
      <p className="roadmap-access"><strong>Verified access: </strong>{roadmap.access.answer}</p>
      {roadmap.workload && <div className="roadmap-workload"><p>{roadmap.workload.answer} {roadmap.workload.limitation}</p><FaqSource faq={roadmap.workload} /></div>}
      <FaqSource faq={roadmap.access} />
    </aside>
    <div className="roadmap-grid">{roadmap.months.map(month => <article className="roadmap-card" data-month={month.number} key={month.number}>
      <span className="section-caption">MONTH {month.number}</span><h3>{month.title}</h3>
      <dl><dt>Main learning focus</dt><dd>{month.focus}</dd>
        <dt>Verified course topics</dt><dd><ul className="roadmap-topics">{month.topics.map(topic => <li key={topic.title}><a href={topic.sourceUrl} target="_blank" rel="noopener noreferrer">{topic.title}</a></li>)}</ul></dd>
        <dt>{month.number === 3 ? 'Suggested practice project' : 'Suggested practice activity'}</dt><dd>{month.activity}</dd>
        <dt>Milestone to aim for</dt><dd>{month.milestone}</dd>
      </dl>
    </article>)}</div>
    {roadmap.priority.facts.length > 0 && <div className="roadmap-priority"><span className="section-caption">VERIFIED FACT FOR YOUR MAIN CONCERN</span>{roadmap.priority.facts.map(faq => <div key={faq.id}><p>{faq.answer}</p><FaqSource faq={faq} /></div>)}</div>}
    <p className="plan-note">Activities and milestones are optional prototype suggestions, not official Lapaas assignments or guaranteed deliverables. Adapt or reduce scope as needed.</p>
  </section>;
}
