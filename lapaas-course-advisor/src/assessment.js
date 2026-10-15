import { faqs, knowledgeBase } from './faq.js';
import { getLearningGuidance, concernGuidance } from './recommendation-guidance.js';
import { createLearningRoadmap } from './learning-roadmap.js';
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
  { id: 'concern', short: 'Your concern', title: 'What is your biggest concern?', helper: 'We will include a practical suggestion for this in your learning plan.', options: [] },
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

  const goalLabel = answerLabel('goal', profile.goal, profile);
  const guidance = getLearningGuidance(profile, { goal, goalLabel, interestLabel: answerLabel('interest', profile.interest, profile) });
  const considerations = [
    { id: 'access', title: 'Your course access', text: 'The supplied course information lists three months of access from activation. Plan your start date around your other commitments and confirm current terms on the official page.', factIds: ['KB008'] },
    { id: 'format', title: 'Learn at your own pace', text: 'The course is self-paced. Use the lessons and learner community as you practise. Scheduled live classes and private one-to-one mentoring are not verified in the supplied information.', factIds: ['KB007', 'KB011'] },
    { id: 'outcomes', title: 'Learning and practical outcomes', text: 'Use the curriculum as a starting point for practice and building your own work. Jobs, salaries, client income, business savings and completed projects are not guaranteed; progress depends on your practice and circumstances.', factIds: goal === 'portfolio' || goal === 'career' ? ['KB006'] : ['KB005'] },
  ];
  considerations.push({ id: 'time', title: 'Your suggested study rhythm', text: guidance.learningPlan.find((item) => item.id === 'time').text + ' This is a suggested plan, not an official weekly-hour requirement or a completion estimate.', factIds: ['KB015', 'KB008'] });
  if (beginner || ['coding', 'difficulty'].includes(profile.concern)) considerations.push({ id: 'practice', title: 'Build confidence through practice', text: 'Start with one small task and build on what you learn. The course FAQ allows learners to start without coding experience, and community access provides a route for questions.', factIds: ['KB003', 'KB011'] });
  if (profile.role === 'professional') considerations.push({ id: 'audience', title: 'Connect the topics with your work', text: 'Use your work tasks to choose relevant practice. This plan adapts the general curriculum to your interests; the supplied course information does not describe a separate working-professional track.', factIds: ['KB002'] });
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
  const selectedProject = contextualProjects[profile.interest]
    || (profile.role === 'professional' && interest === 'rag' ? professionalRag : projects[interest])
    || goalProjects[goal] || professionalRag;
  // Keep a beginner's first version small without discarding their chosen goal or interest.
  const project = profile.experience === 'beginner'
    ? (interest === 'unsure' && goal === 'scratch'
      ? (roleStarter[profile.role] || goalProjects.scratch)
      : { ...selectedProject, description: 'Start with a simple version using sample data, then add one AI feature as you learn. ' + selectedProject.description })
    : selectedProject;
  const factIds = [...new Set([...concernGuidance[profile.concern].factIds, 'KB008', 'KB007'])].slice(0, 3);
  const facts = factIds.map((id) => faqs.find((faq) => faq.id === id));
  return {
    profile: questions.map(({ id, short }) => ({ id, label: short, answer: answerLabel(id, profile[id], profile) })),
    goal: goalLabel, ...guidance, topics, project: { ...project, label: 'Suggested practice project — adapt it to your goals' },
    considerations: considerations.map((item) => ({ ...item, facts: item.factIds.map((id) => faqs.find((faq) => faq.id === id)) })),
    facts, officialUrl: knowledgeBase.official_course_url,
    roadmap: createLearningRoadmap(profile, { goal, goalLabel, interest, interestLabel: answerLabel('interest', profile.interest, profile), project }),
  };
}
