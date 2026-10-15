import React from 'react';
import { knowledgeBase } from './faq.js';
import { getFaqSource } from './faq-sources.js';

export function Icon({ name, size = 20, ...props }) {
  const paths = {
    plus: <path d="M12 5v14M5 12h14" />,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    community: <><circle cx="9" cy="8" r="3" /><path d="M3 21v-3a6 6 0 0 1 12 0v3M17 5a3 3 0 0 1 0 6M21 21v-3a6 6 0 0 0-4-5" /></>,
    route: <><circle cx="5" cy="19" r="2" /><circle cx="19" cy="5" r="2" /><path d="M5 17v-6a4 4 0 0 1 4-4h2M19 7v6a4 4 0 0 1-4 4h-2M8 4l3 3-3 3M16 14l-3 3 3 3" /></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    external: <><path d="M14 4h6v6M20 4l-9 9M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5" /></>,
    check: <path d="m5 12 4 4 10-10" />,
    book: <><path d="M12 5v15M12 5C8 2 3 4 3 4v15s5-2 9 1c4-3 9-1 9-1V4s-5-2-9 1Z" /></>,
    shield: <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" /><path d="m8 12 3 3 5-6" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7v1" /></>,
    close: <path d="m6 6 12 12M6 18 18 6" />,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>;
}

export function OfficialLink({ children = 'Visit official course page', className = '' }) {
  return <a className={className} href={knowledgeBase.official_course_url} target="_blank" rel="noopener noreferrer">{children}<Icon name="external" size={15} /></a>;
}

export function FaqSource({ faq, benefit = false }) {
  const source = getFaqSource(faq);
  return <div className={benefit ? 'benefit-reference' : 'source-reference'} data-kb-source={faq.id}>
    <div className={benefit ? 'benefit-source' : 'card-source'}>{!benefit && <span>Source</span>}<a href={source.href} target="_blank" rel="noopener noreferrer" aria-label={`${source.label} (opens in a new tab)`}>{source.label}<Icon name="external" size={13} /></a></div>
    {source.note && <p className="source-navigation-note">{source.note}</p>}
  </div>;
}
