import skillsMapping from '../../data/skills_mapping.json' with { type: 'json' };
import { faqs } from './faq.js';

export const ROADMAP_DISCLAIMER = 'This is a suggested learning roadmap based on your answers, not an official Lapaas course schedule or a guarantee of completion.';
const skills = new Map(skillsMapping.published_curriculum_skills.map(topic => [topic.skill, topic]));
const fact = id => faqs.find(item => item.id === id);
function topics(names) {
  return [...new Set(names)].map(name => {
    const topic = skills.get(name);
    if (!topic) throw new Error(`Missing verified roadmap topic: ${name}`);
    return { skill: topic.skill, title: topic.module, sourceUrl: skillsMapping.metadata.source_url };
  }).filter((topic, index, all) => all.findIndex(item => item.title === topic.title) === index);
}

// Everything below describes optional practice, not course lessons or official timing.
const rolePractice = {
  college: 'Choose a small campus or study problem and use fictional examples.',
  'final-year': 'Choose a project you could present alongside your final-year work, using sample data.',
  fresher: 'Choose a problem you can explain in a project walkthrough, using fictional examples.',
  freelancer: 'Write a fictional client brief and define which outputs need human review.',
  business: 'Map one repetitive business workflow using non-sensitive sample requests.',
  professional: 'Choose a work-reference or productivity task and replace workplace data with samples.',
};
const goalPractice = {
  scratch: { focus: 'Understand core ideas before adding an AI feature.', activity: 'Explain one AI concept in your own words before trying it in your example.', skills: ['AI-assisted coding', 'Full-stack development'] },
  career: { focus: 'Connect development practice with a demo you can explain.', activity: 'Record an engineering choice and why you made it for a future project walkthrough.', skills: ['Full-stack development', 'RAG'] },
  portfolio: { focus: 'Turn a project brief into demonstrable work.', activity: 'Define a clear demo story and a way to check whether the example works.', skills: ['AI-assisted coding', 'Full-stack development', 'RAG'] },
  product: { focus: 'Develop one useful part of your product idea.', activity: 'Sketch one user flow and decide what the first version will leave out.', skills: ['MVP and PRD', 'Full-stack development', 'APIs'] },
  upskill: { focus: 'Apply an AI concept to a skill you already use.', activity: 'Identify a gap in your current workflow and compare the example before and after your change.', skills: ['AI-assisted coding', 'Full-stack development'] },
  services: { focus: 'Explore a small client-service workflow.', activity: 'Define a fictional client input, the draft output and a human approval step.', skills: ['AI agents', 'APIs'] },
  operations: { focus: 'Prototype one part of a business workflow.', activity: 'Mark the input, routing decision and human review step in a sample workflow.', skills: ['MVP and PRD', 'Automation', 'APIs'] },
};
const interestSkills = {
  chatbot: ['Full-stack development', 'RAG'], rag: ['RAG', 'APIs'],
  web: ['Full-stack development', 'APIs'], agents: ['AI agents', 'APIs'],
  'business-tools': ['MVP and PRD', 'APIs'], unsure: [],
};
const experiencePractice = {
  beginner: { focus: 'AI basics and a guided first exercise', skills: ['AI fundamentals', 'AI-assisted coding'], activity: 'Read a small example with coding assistance; explain the input and output before changing one part.', milestone: 'An explained example and a short note about what you still need to practise.' },
  tools: { focus: 'Move from AI tools to a small development example', skills: ['AI fundamentals', 'AI-assisted coding'], activity: 'Inspect a generated code example, locate its input and output, and practise checking one change.', milestone: 'A checked code change you can describe without relying on the tool explanation.' },
  basics: { focus: 'Development foundations and project planning', skills: ['AI-assisted coding', 'MVP and PRD', 'Full-stack development'], activity: 'Review how an interface, data and application logic connect; sketch the first version.', milestone: 'A narrow project brief and a sketch of how its parts connect.' },
  coding: { focus: 'Plan the AI workflow around your existing coding skills', skills: ['MVP and PRD'], activity: 'Trace the data flow and identify the AI-specific part to explore, rather than repeating basic syntax.', milestone: 'A scoped workflow with a testable input and expected output.' },
  builder: { focus: 'Review an existing workflow and choose a deeper practice gap', skills: ['Testing and evaluation'], activity: 'Inspect an existing sample application and select a retrieval, integration or evaluation gap to investigate.', milestone: 'A documented gap and a baseline test to compare with your next iteration.' },
};
const timePractice = {
  low: {
    title: 'A small starting plan', text: 'With less than 2 hours per week, completing the entire curriculum within the three-month access window may be challenging. Prioritize a few relevant topics and a simple demonstration; this plan does not establish that three months will be sufficient.',
    activities: ['Choose just one concept or exercise at a time.', 'Sketch one interaction and try a local or manually checked example; defer extra tools and integrations.', 'Keep only one sample-data flow; a simple local demonstration is enough to aim for.'],
    milestones: ['One small exercise you can explain.', 'One checked interaction or sketch, rather than a full application.', 'A limited demonstration of one flow, with a clear note of its limits.'],
  },
  some: {
    title: 'A focused mini-project', text: 'With 2–5 hours per week, alternate manageable concept learning and small exercises. Prioritize the topics that serve your mini-project; adjust the plan as you learn.',
    activities: ['Choose a narrow exercise and keep notes about what to practise next.', 'Build one interaction in a mini-project before connecting another part.', 'Test a focused sample-data flow and document what remains unfinished.'],
    milestones: ['A focused exercise and a short project brief.', 'One working or demonstrable part of the mini-project.', 'A focused demo with sample tests and documented limitations.'],
  },
  regular: {
    title: 'Build, test and review', text: 'With 5–10 hours per week, combine related concepts with hands-on practice, then review and improve the work. These monthly milestones are aims, not completion commitments.',
    activities: ['Connect a planning exercise with a development example.', 'Combine related components and check normal and unexpected sample inputs.', 'Build and test the core project flow, review errors and improve one weak point.'],
    milestones: ['A project brief and a checked development example.', 'Connected components with notes from sample tests.', 'A demonstrable core flow, test notes and one reviewed improvement.'],
  },
  high: {
    title: 'Explore and iterate', text: 'With more than 10 hours per week, allow broader practice and extra test-and-review iterations where your experience supports them. More available time does not guarantee course completion.',
    activities: ['Compare two small approaches and explain which fits your starting experience.', 'Explore a related integration only after the first flow is understood and tested.', 'Compare iterations using varied sample cases; refine reliability before adding features.'],
    milestones: ['A justified approach and a documented practice baseline.', 'A tested core flow and an optional integration experiment.', 'A reviewed demo with a comparison of iterations and remaining limitations.'],
  },
  unsure: {
    title: 'Find a sustainable rhythm', text: 'Choose a sustainable study rhythm, try a small task, then adjust the monthly aims around your commitments and the access window. No fixed study-hour estimate is assumed.',
    activities: ['Try a small exercise before deciding how much practice to schedule.', 'Keep the first interaction small and revisit scope once you know your rhythm.', 'Aim for a simple sample-data demonstration; carry unfinished practice into your own future learning plan.'],
    milestones: ['A tried exercise and a study rhythm to revisit.', 'A small interaction or sketch at a pace you can sustain.', 'A simple demonstration or documented prototype to continue developing.'],
  },
};
// Concern changes a practical priority within a month, not just a profile label.
const concernPractice = {
  coding: { month: 0, text: 'Use a guided code example and explain each change before attempting an independent build.', factIds: ['KB003'] },
  difficulty: { month: 0, text: 'Break the example into input, processing and output; practise the least familiar part separately.', factIds: ['KB003'] },
  career: { month: 2, text: 'Prepare a demo walkthrough and explain your tests and decisions. This is practice, not a job, placement or salary guarantee.', factIds: [] },
  value: { month: 0, text: 'Check the verified fee and current terms before choosing tools; use sample or local exercises to avoid assuming extra paid tools are included.', factIds: ['KB009'] },
  access: { month: 0, text: 'Choose the most important topic before activation and plan your start around the published access window; no extension is assumed.', factIds: [] },
  starting: { month: 0, text: 'Begin with one core AI concept and one small example before selecting additional tools.', factIds: [] },
  portfolio: { month: 2, text: 'Add a concise demo description, sample tests and an explanation of your own contribution.', factIds: [] },
  'business-relevance': { month: 1, text: 'Check that the sample output addresses the business problem; do not assume savings from a practice demo.', factIds: [] },
  implementation: { month: 1, text: 'Prototype one component in isolation and add connections only after you understand its behaviour.', factIds: [] },
  time: { month: 1, text: 'Remove optional features before reducing the time you leave for understanding and checking the example.', factIds: [] },
  'learning-development': { month: 1, text: 'Trace a request through the interface and application logic; keep a short note on what each part does.', factIds: [] },
  'client-application': { month: 2, text: 'Present a fictional client example with an explicit human approval step before any real client use.', factIds: [] },
};

export function createLearningRoadmap(profile, { goal, goalLabel, interest, interestLabel, project }) {
  const start = experiencePractice[profile.experience];
  const direction = goalPractice[goal];
  const pace = timePractice[profile.time];
  const priority = concernPractice[profile.concern];
  const specialization = interestSkills[interest];
  const firstTopics = [...start.skills];
  if (['coding', 'builder'].includes(profile.experience)) firstTopics.push(...(specialization.length ? specialization : direction.skills).slice(0, 1));
  if (['coding', 'difficulty', 'starting'].includes(profile.concern) && !firstTopics.includes('AI fundamentals')) firstTopics.unshift('AI fundamentals');
  const monthSkills = [firstTopics, [...direction.skills, ...specialization], [...specialization, 'Testing and evaluation']];
  if (['regular', 'high'].includes(profile.time) && !['beginner', 'tools'].includes(profile.experience)) monthSkills[2].push('Deployment');
  const activities = [
    `${rolePractice[profile.role]} ${start.activity} ${direction.activity}`,
    `Use “${interestLabel}” as your practice theme. ${['beginner', 'tools'].includes(profile.experience) ? 'Start with a guided example and check the code before connecting components.' : 'Apply the concepts to your own sample workflow and check how the components exchange data.'}`,
    `${project.description} ${goal === 'career' ? 'Record a short explanation of your engineering decisions.' : goal === 'portfolio' ? 'Prepare a concise project walkthrough with sources and test notes.' : goal === 'services' ? 'Explain where a client would review the draft output.' : goal === 'operations' ? 'Keep a human review step before any operational action.' : 'Explain the user problem and the limits of your example.'}`,
  ];
  const months = ['Build Your Foundation', 'Apply Your Skills', 'Build a Practical Demo'].map((title, i) => ({
    number: i + 1, title,
    focus: i === 0 ? start.focus : i === 1 ? direction.focus : project.title,
    topics: topics(monthSkills[i]),
    activity: `${activities[i]} ${pace.activities[i]}${priority.month === i ? ` ${priority.text}` : ''}`,
    milestone: i === 0 && !['low', 'unsure'].includes(profile.time) ? `${start.milestone} ${pace.milestones[i]}` : pace.milestones[i],
  }));
  return {
    introduction: `For your goal, “${goalLabel}”, explore “${interestLabel}” through the monthly practice priorities below. Adjust the aims to your progress; these months are a suggested sequence, not lesson durations.`,
    months, time: { title: pace.title, text: pace.text },
    access: fact('KB008'), workload: profile.time === 'low' ? fact('KB015') : null,
    priority: { text: priority.text, facts: priority.factIds.map(fact) },
    disclaimer: ROADMAP_DISCLAIMER,
  };
}
