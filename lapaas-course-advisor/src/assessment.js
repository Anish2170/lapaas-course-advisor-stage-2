import { faqs, knowledgeBase } from './faq.js';
import skillsMapping from '../../data/skills_mapping.json' with { type: 'json' };
import { getGoalOptions, getInterestOptions, getConcernOptions, goalIntent, interestIntent } from './assessment-options.js';
export { roleGoals, otherGoals } from './assessment-options.js';

const options = (entries) => entries.map(([value, label]) => ({ value, label }));
export const questions = [
  { id: 'role', short: 'Your background', title: 'What best describes you?', helper: 'Choose the role closest to where you are today.', options: options([
    ['college', 'College Student'], ['final-year', 'Final-Year Student'], ['fresher', 'Recent Graduate / Fresher'],
    ['freelancer', 'Freelancer / Marketer'], ['business', 'Business Owner'], ['professional', 'Working Professional'],
  ]) },
  { id: 'goal', short: 'Your goal', title: 'What is your primary goal?', helper: 'Pick one priority. Your recommendation will start here.', options: [] },
  { id: 'experience', short: 'Your experience', title: 'What is your current AI and coding experience?', helper: 'No need to overstate it. This helps us suggest a starting point.', options: options([
    ['beginner', 'Complete beginner'], ['tools', 'I use ChatGPT or other AI tools but cannot code'],
    ['basics', 'Basic programming knowledge'], ['coding', 'Comfortable with coding'], ['builder', 'Already building AI applications'],
  ]) },
  { id: 'interest', short: 'Your interests', title: 'What would you like to build or learn?', helper: 'Choose a direction to explore. It is fine to be undecided.', options: [] },
  { id: 'time', short: 'Your study time', title: 'How much time can you dedicate each week?', helper: 'Think about time for practice as well as watching lessons.', options: options([
    ['low', 'Less than 2 hours'], ['some', '2–5 hours'], ['regular', '5–10 hours'], ['high', 'More than 10 hours'], ['unsure', 'Not sure'],
  ]) },
  { id: 'concern', short: 'Your concern', title: 'What is your biggest concern?', helper: 'We will address this directly, including what the published information cannot confirm.', options: [] },
];

export const initialAssessment = { step: 0, answers: {}, complete: false };
export function getQuestion(id, profile = {}) {
  const question = questions.find((item) => item.id === id);
  if (!question) return undefined;
  const contextualOptions = { goal: getGoalOptions, interest: getInterestOptions, concern: getConcernOptions };
  return { ...question, options: Object.hasOwn(contextualOptions, id) ? contextualOptions[id](profile) : question.options };
}
export function isValidAnswer(id, value, profile = {}) {
  return getQuestion(id, profile)?.options.some((option) => option.value === value) || false;
}
export const isCompleteProfile = (profile) => Boolean(profile && [undefined, 'role', 'other'].includes(profile.goalScope) && questions.every(({ id }) => isValidAnswer(id, profile[id], profile)));
export const answerLabel = (id, value, profile = {}) => getQuestion(id, profile)?.options.find((option) => option.value === value)?.label || 'Not answered';

// Validate in dependency order. An invalid goal also invalidates its project interests.
// Experience/time are independent and survive role/goal changes when valid.
export function revalidateAnswers(profile = {}) {
  const valid = profile.goalScope === 'other' ? { goalScope: 'other' } : {};
  for (const { id } of questions) {
    if (isValidAnswer(id, profile[id], { ...valid, [id]: profile[id] })) valid[id] = profile[id];
  }
  return valid;
}

// The UI and tests use this same reducer. Unknown answers/actions cannot complete a profile.
export function assessmentReducer(state, action) {
  switch (action.type) {
    case 'select': {
      const question = questions[state.step];
      if (state.complete || !isValidAnswer(question.id, action.value, state.answers)) return state;
      const proposed = { ...state.answers, [question.id]: action.value };
      const answers = revalidateAnswers(proposed);
      const removed = questions.filter(({ id }) => proposed[id] && !answers[id]).map(({ short }) => short.toLowerCase());
      return { ...state, answers, notice: removed.length ? `Please revisit ${removed.join(' and ')}. Incompatible selections were cleared after your answer changed.` : '' };
    }
    case 'goal-scope': {
      if (state.complete || state.step !== 1 || !['role', 'other'].includes(action.value)) return state;
      const proposed = { ...state.answers, goalScope: action.value };
      const answers = revalidateAnswers(proposed);
      return { ...state, answers, notice: proposed.goal && !answers.goal ? 'Choose a goal from this list. Incompatible dependent selections were cleared.' : '' };
    }
    case 'next': {
      if (state.complete) return state;
      const answers = revalidateAnswers(state.answers);
      if (!isValidAnswer(questions[state.step].id, answers[questions[state.step].id], answers)) return state;
      if (state.step === questions.length - 1) {
        const missing = questions.findIndex(({ id }) => !isValidAnswer(id, answers[id], answers));
        return missing === -1 ? { ...state, answers, complete: true } : { ...state, answers, step: missing, notice: 'Please complete the updated questions before viewing your learning path.' };
      }
      return { ...state, answers, step: state.step + 1 };
    }
    case 'back': return { ...state, complete: false, step: Math.max(0, state.step - (state.complete ? 0 : 1)) };
    case 'edit': return { ...state, complete: false, step: 0 };
    case 'restart': return { step: 0, answers: {}, complete: false };
    default: return state;
  }
}

// Module names and coverage come from supplied public-curriculum data, not generated claims.
const topicSkills = {
  foundations: 'AI fundamentals', planning: 'MVP and PRD', assisted: 'AI-assisted coding',
  fullstack: 'Full-stack development', rag: 'RAG', integrations: 'APIs',
  agents: 'Automation', shipping: 'Deployment',
};
const goalTopics = {
  career: [['fullstack', 'A working application gives you concrete engineering decisions to discuss in applications and interviews.'], ['rag', 'Retrieval is a useful direction for exploring document-based AI applications.'], ['shipping', 'A demo others can open makes your own practice work easier to inspect.']],
  portfolio: [['assisted', 'Use coding assistance while learning to explain and check your own implementation.'], ['fullstack', 'Connect an interface, data and application logic in a portfolio demo.'], ['shipping', 'Publish a small demo and document the choices you made.']],
  scratch: [['foundations', 'Start by understanding models and context before taking on a larger build.'], ['planning', 'Choose a narrow problem so your first attempt stays manageable.'], ['assisted', 'Use coding assistance as a learning aid, with deliberate practice.'], ['fullstack', 'Explore how the pieces of an application fit together.']],
  product: [['planning', 'Define a small first version and the user problem before building.'], ['fullstack', 'Connect the interface and application data for your own product idea.'], ['integrations', 'Explore how an app connects to tools and APIs.'], ['shipping', 'Test a small release and learn from feedback.']],
  upskill: [['foundations', 'Review the AI concepts that relate to your current work or technical learning goals.'], ['assisted', 'Practise using coding assistance while understanding and checking your implementation.'], ['fullstack', 'Build a small application to connect concepts with hands-on development.']],
  services: [['agents', 'Explore repeatable workflow tasks that could form a scoped client-service demo.'], ['integrations', 'Client workflows often need connections between tools; practise with sample data.'], ['shipping', 'Test a demonstration and document its boundaries before proposing client work.']],
  operations: [['planning', 'Choose one operational bottleneck and define a small test.'], ['agents', 'Explore a supervised workflow for a repetitive business task.'], ['integrations', 'Practise connecting systems with sample inputs before using business data.'], ['shipping', 'Test reliability and review errors before considering real operational use.']],
};
const interestTopics = {
  chatbot: [['rag', 'For your chatbot interest, explore how retrieval can ground answers in a small document set.'], ['integrations', 'Explore connecting a chatbot to a narrow tool or API when it is useful.']],
  web: [['fullstack', 'Your web-application interest calls for an interface connected to application logic and data.'], ['shipping', 'Test and share a web demo others can open.']],
  agents: [['agents', 'Your agent interest is a reason to practise small, supervised workflows.'], ['integrations', 'Explore the tool connections a workflow needs.']],
  rag: [['rag', 'This directly matches your interest in retrieval-based applications.'], ['integrations', 'Explore connecting your document workflow to an interface or API.']],
  'business-tools': [['planning', 'Define the business task and a way to judge a small prototype.'], ['agents', 'Explore a narrow workflow for a business task.'], ['integrations', 'Practise tool connections without using sensitive business data.']],
  unsure: [['foundations', 'Explore core concepts before choosing a technical direction.'], ['planning', 'Choose one small problem before selecting more tools.']],
};

const projects = {
  chatbot: { title: 'Campus information helper', description: 'Use a short set of sample campus FAQs. Show sources and an explicit unknown-answer response. Start with a simple interface before adding integrations.' },
  web: { title: 'Student project showcase', description: 'Build a small website for a few sample projects. Add one narrow AI feature later, such as drafting a project summary that the user can review.' },
  agents: { title: 'Supervised weekly research digest', description: 'Create a workflow that organises a few sample notes into a draft digest. Require human review before any message is sent.' },
  rag: { title: 'Study-notes question answering demo', description: 'Use a few non-sensitive sample notes. Retrieve relevant excerpts, display sources and decline questions the notes cannot answer.' },
  'business-tools': { title: 'Sample enquiry triage tool', description: 'Classify fictional customer enquiries into a few categories and draft a response for human review. Do not connect it to a live customer inbox.' },
};
const goalProjects = {
  upskill: { title: 'Small AI practice application', description: 'Choose one fictional study or work task and build a small application around it. Check its behaviour and explain your decisions before adding more features.' },
  career: { title: 'Internship application organiser', description: 'Build a small app using fictional roles and sample application notes. Explain the implementation and publish a demo; this is practice, not evidence of hiring chances.' },
  portfolio: projects.rag,
  scratch: { title: 'Simple study FAQ explorer', description: 'Begin with a few local questions and answers and a simple search interface. Add a clear fallback. Extend it only when you understand the first version.' },
  product: { title: 'Small idea-validation assistant', description: 'Let a user organise a fictional product problem, audience and assumptions into a brief. Keep the first version narrow and review every generated suggestion.' },
  services: { title: 'Client reporting draft workflow', description: 'Turn fictional campaign notes into a structured draft report for human review. Document its limits before considering any client use.' },
  operations: projects['business-tools'],
};

export function recommend(profile) {
  if (!isCompleteProfile(profile)) return null;
  const goal = goalIntent(profile);
  const interest = interestIntent(profile);
  const beginner = ['beginner', 'tools'].includes(profile.experience);
  const topics = [];
  function addTopic(id, why) {
    const existing = topics.find((topic) => topic.id === id);
    if (existing) { if (!existing.reasons.includes(why)) existing.reasons.push(why); return; }
    const skill = skillsMapping.published_curriculum_skills.find((entry) => entry.skill === topicSkills[id]);
    if (!skill) throw new Error(`Missing verified curriculum mapping: ${id}`);
    topics.push({ id, title: skill.module, publishedSkill: skill.skill, reasons: [why], sourceUrl: skillsMapping.metadata.source_url, verifiedOn: skillsMapping.metadata.verified_on });
  }
  if (beginner) {
    addTopic('foundations', 'Given your starting experience, build a basic understanding of models, context and a useful problem first.');
    addTopic('assisted', 'Build coding familiarity gradually; using an AI tool does not replace understanding and checking the code.');
  }
  goalTopics[goal].forEach(([id, why]) => addTopic(id, why));
  interestTopics[interest].forEach(([id, why]) => addTopic(id, why));
  if (goal === 'portfolio') {
    addTopic('rag', 'Explore a retrieval-based demo as one possible portfolio direction, with sources and honest unknown responses.');
    addTopic('shipping', 'Test the project, review errors and deployment behaviour, and explain your decisions alongside the demo.');
  }
  if (profile.concern === 'starting') addTopic('foundations', 'Your concern about where to start is a reason to begin with foundations.');

  let suitability;
  if (profile.time === 'low') suitability = { kind: 'pause', title: 'Pause before enrolling: make time for practice', explanation: 'You selected less than 2 hours each week. That raises a concern against the published advice to plan several focused hours for lessons and practice. Relevant topics are shown below for exploration, but resolve the time constraint before paying.', nextStep: 'First decide whether you can make room for regular practice within the access window. If not, consider postponing enrolment. Review the official access and study-time details.' };
  else if (profile.time === 'unsure') suitability = { kind: 'clarify', title: 'Clarify your study schedule first', explanation: 'The curriculum relates to your selected interests, but your available time is unknown. That is not enough to recommend enrolment confidently. Check your college or work commitments against the published practice advice and access window.', nextStep: 'Make a realistic weekly study plan, then return and update your answers. Confirm the current course terms before deciding.' };
  else if (profile.experience === 'builder') suitability = { kind: 'review', title: 'Review curriculum depth before enrolling', explanation: 'You already build AI applications. The published topic list may overlap with what you know and does not establish the depth you need. The topics below are areas to check, rather than evidence that this course will advance your skills.', nextStep: 'Compare the official curriculum with projects you already build. Ask Lapaas to clarify depth and any missing requirements before deciding to pay.' };
  else if (beginner) suitability = { kind: 'cautious', title: 'A possible starting point, with a practice plan', explanation: 'The supplied FAQ allows beginners to start and stresses practice. Your goal relates to the topics below, but plan small steps rather than expecting immediate mastery. This is a conditional learning suggestion, not confirmation that the course will suit every beginner.', nextStep: 'Review the coding, format and access FAQs. Try a small practice task and check whether you can sustain regular study before deciding.' };
  else suitability = { kind: 'explore', title: 'Relevant topics to explore, with conditions', explanation: 'Your selected goal and interests relate to the published topics below. Your experience gives us a direction for practice, but this short assessment cannot establish your proficiency, course suitability or outcomes.', nextStep: 'Compare the recommended areas with the official curriculum, review the limitations and confirm current terms before deciding whether to enrol.' };

  const considerations = [
    { id: 'access', title: 'Plan around the access window', text: 'Do not assume extra time will be available. Access extension terms are not verified in the supplied information.', factIds: ['KB008'] },
    { id: 'format', title: 'Check that self-paced study suits you', text: 'If you need scheduled instruction, check other learning options or ask Lapaas for clarification. Private one-to-one mentoring is not verified.', factIds: ['KB007', 'KB011'] },
    { id: 'outcomes', title: 'Topics are not a promise of results', text: 'Curriculum coverage does not establish personal proficiency or job readiness. Jobs, salaries, client income, business savings and completed projects are not guaranteed by this recommendation.', factIds: goal === 'portfolio' || goal === 'career' ? ['KB006'] : ['KB005'] },
  ];
  if (profile.time === 'some') considerations.push({ id: 'time', title: 'Leave room for hands-on work', text: 'Your 2–5-hour range may leave limited practice time. There is no verified minimum weekly-hour requirement or completion estimate; the exact total video duration is also unverified.', factIds: ['KB015'] });
  if (profile.time === 'high') considerations.push({ id: 'time', title: 'More available time is not a completion guarantee', text: 'Use your available time for practice as well as lessons. The published information does not establish how quickly you personally will finish.', factIds: ['KB015'] });
  if (beginner || ['coding', 'difficulty'].includes(profile.concern)) considerations.push({ id: 'practice', title: 'Start small and check your understanding', text: 'Beginner entry does not mean effortless learning. Try a small task, review what the code does, and use the verified community route for questions. Specific support response times are not verified.', factIds: ['KB003', 'KB011'] });
  if (profile.role === 'professional') considerations.push({ id: 'audience', title: 'Check relevance to your work', text: 'Working professionals are not named as a separate audience in the supplied FAQ. Compare the topics with your actual work tasks rather than assuming a role-specific course track.', factIds: ['KB002'] });

  const concernGuidance = {
    coding: { title: 'Your concern: coding', text: 'Start with foundations and a small coding task. Being allowed to start without coding does not establish how much help you personally will need.', factIds: ['KB003'] },
    difficulty: { title: 'Your concern: difficulty', text: 'Keep the first project small and check the published syllabus. Teaching depth and your personal learning pace cannot be inferred from the topic list.', factIds: ['KB004', 'KB003'] },
    career: { title: 'Your concern: career outcomes', text: 'Focus on explaining your own practical work. Placement support, hiring outcomes and specific salaries are not verified; the course should not be chosen on the assumption of a guaranteed job.', factIds: ['KB006'] },
    value: { title: 'Your concern: value for money', text: 'Compare the listed fee, access period and relevant topics with your needs. Value is personal. Included premium AI credits and total third-party tool costs are not verified. Review refund eligibility rather than assuming an unconditional refund.', factIds: ['KB009', 'KB008', 'KB013'] },
    access: { title: 'Your concern: three-month access', text: 'Plan around exams and work commitments before activating. Extensions and continued access beyond the published window are not verified.', factIds: ['KB008'] },
    starting: { title: 'Your concern: where to begin', text: 'Use foundations, then a narrow problem and one small build as a suggested starting sequence. This is our practice guidance, not a promised official course schedule.', factIds: ['KB004', 'KB003'] },
    portfolio: { title: 'Your concern: portfolio projects', text: 'Practise one small project, test it and explain the decisions you made. Published portfolio guidance does not guarantee a finished portfolio or a job.', factIds: ['KB006', 'KB005'] },
    'business-relevance': { title: 'Your concern: business relevance', text: 'Compare the published topics with one specific workflow in your business. A topic match alone does not establish suitability or business results.', factIds: ['KB002', 'KB004'] },
    implementation: { title: 'Your concern: implementation effort', text: 'Start with a narrow prototype and sample data. Learning, testing and integrating a real workflow take effort; immediate production readiness is not established.', factIds: ['KB005', 'KB015'] },
    time: { title: 'Your concern: available time', text: 'Plan for lessons and practice inside the published access window. Exact completion time and access extension terms are not verified.', factIds: ['KB015', 'KB008'] },
    'learning-development': { title: 'Your concern: learning AI development', text: 'Choose a small development task and check your understanding before extending it. Beginner entry is not proof of personal proficiency or advanced mastery.', factIds: ['KB003', 'KB005'] },
    'client-application': { title: 'Your concern: applying skills to client work', text: 'Practise with fictional client data and human review before proposing a live implementation. Client suitability, income and business results depend on the actual work and are not established by course coverage.', factIds: ['KB004', 'KB005'] },
  };
  considerations.push({ id: 'concern', ...concernGuidance[profile.concern] });

  // A broad interest uses the primary goal; an explicit build interest refines the example.
  // Beginners get a deliberately small first task before tackling a technical idea.
  const contextualProjects = {
    'client-automation': goalProjects.services,
    'marketing-assistant': { title: 'Campaign brief assistant', description: 'Use fictional campaign notes to draft a structured brief. Let a human review every suggestion; do not connect it to a live campaign.' },
    'client-chatbot': { title: 'Sample client FAQ assistant', description: 'Use fictional client FAQs, show answer sources and decline unsupported questions. Test the demo before considering live client use.' },
    'content-workflow': { title: 'Client content review workflow', description: 'Organise fictional client notes into a draft content plan with a required human review step. Do not publish automatically.' },
    'support-automation': projects['business-tools'],
    'internal-workflow': { title: 'Internal request routing demo', description: 'Route fictional internal requests into a few categories. Review incorrect classifications before considering any operational integration.' },
    'business-knowledge': { title: 'Business knowledge Q&A demo', description: 'Use non-sensitive sample business documents, retrieve relevant excerpts, show sources and decline unsupported questions.' },
    'custom-business': { title: 'Small business request tool', description: 'Prototype one narrow workflow using fictional business requests. Test the application and review outputs before connecting real systems.' },
    'productivity-workflow': { title: 'Weekly work-planning assistant', description: 'Organise fictional task notes into a draft weekly plan for human review. Compare the result with the original notes and document errors.' },
    'application-development': { title: 'Work-task application demo', description: 'Build a small app around fictional work tasks, add one narrow AI-assisted feature, and test it before sharing a demonstration.' },
  };
  const roleStarter = {
    business: { title: 'Sample business FAQ explorer', description: 'Start with a few fictional business questions and local answers. Add simple search, sources and a fallback before attempting automation.' },
    freelancer: { title: 'Sample client FAQ explorer', description: 'Start with fictional client questions and local answers. Add simple search and a fallback; this is a learning task, not a client-service promise.' },
    professional: { title: 'Work-reference FAQ explorer', description: 'Start with non-sensitive sample work notes and local questions and answers. Add a simple search and an explicit fallback.' },
  };
  const professionalRag = { title: 'Work-reference question answering demo', description: 'Use non-sensitive sample work notes, retrieve relevant excerpts and display sources. Decline questions outside those notes.' };
  const project = profile.experience === 'beginner' ? (roleStarter[profile.role] || goalProjects.scratch)
    : (contextualProjects[profile.interest] || (profile.role === 'professional' && interest === 'rag' ? professionalRag : projects[interest]) || goalProjects[goal] || professionalRag);
  const facts = ['KB008', 'KB007', 'KB015'].map((id) => faqs.find((faq) => faq.id === id));
  return {
    profile: questions.map(({ id, short }) => ({ id, label: short, answer: answerLabel(id, profile[id], profile) })),
    goal: answerLabel('goal', profile.goal, profile), suitability, topics, project: { ...project, label: 'Suggested practice project — not a guaranteed course assignment' },
    considerations: considerations.map((item) => ({ ...item, facts: item.factIds.map((id) => faqs.find((faq) => faq.id === id)) })),
    facts, officialUrl: knowledgeBase.official_course_url,
  };
}
