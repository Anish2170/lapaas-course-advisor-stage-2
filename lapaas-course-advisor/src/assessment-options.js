// Visitor choices and guidance categories, not additional course claims.
const choices = (entries) => entries.map(([value, label, intent = value]) => ({ value, label, intent }));
export const otherGoals = choices([
  ['career', 'Get an AI internship or job'], ['portfolio', 'Build portfolio projects'], ['scratch', 'Learn AI from scratch'],
  ['product', 'Build my own AI product'], ['services', 'Offer AI services to clients'], ['operations', 'Automate business operations'],
]);
export const roleGoals = {
  college: choices([
    ['career', 'Get an AI internship'], ['portfolio', 'Build portfolio projects'], ['scratch', 'Learn AI from scratch'],
    ['first-app', 'Build my first AI application', 'product'], ['explore-career', 'Explore AI career opportunities', 'career'],
  ]),
  'final-year': choices([
    ['career', 'Prepare for AI jobs or internships'], ['portfolio', 'Build an impressive portfolio'],
    ['practical-development', 'Learn practical AI development', 'upskill'], ['product', 'Build a complete AI product'],
    ['graduation-skills', 'Improve technical skills before graduation', 'upskill'],
  ]),
  fresher: choices([
    ['career', 'Prepare for an AI development career'], ['job-projects', 'Build job-relevant AI projects', 'portfolio'],
    ['portfolio', 'Improve my technical portfolio'], ['product-engineering', 'Learn AI product engineering', 'product'],
    ['services', 'Explore freelancing opportunities'],
  ]),
  freelancer: choices([
    ['services', 'Offer AI services to clients'], ['client-workflows', 'Automate client workflows', 'services'],
    ['marketing-tools', 'Build AI marketing tools', 'product'], ['product', 'Create AI-powered products'],
    ['freelance-skills', 'Improve my freelancing skills', 'services'],
  ]),
  business: choices([
    ['operations', 'Automate repetitive business operations'], ['business-tools', 'Build AI tools for my business', 'product'],
    ['efficiency', 'Improve business efficiency', 'operations'], ['workload', 'Reduce manual workload using AI', 'operations'],
    ['product', 'Develop my own AI-powered product'],
  ]),
  professional: choices([
    ['upskill', 'Upgrade my current skills with AI'], ['career', 'Switch to an AI-related career'],
    ['work-tasks', 'Automate repetitive work tasks', 'operations'], ['applications', 'Build AI applications', 'product'],
    ['side-project', 'Start an AI side project', 'product'],
  ]),
};
export function getGoalOptions(profile) {
  if (!Object.hasOwn(roleGoals, profile.role)) return [];
  return profile.goalScope === 'other' ? otherGoals : roleGoals[profile.role];
}
export const goalIntent = (profile) => getGoalOptions(profile).find((option) => option.value === profile.goal)?.intent;

const interests = {
  student: choices([['chatbot', 'AI chatbot'], ['rag', 'RAG application'], ['web', 'Full-stack AI application'], ['agents', 'AI automation project'], ['unsure', 'Not Sure Yet']]),
  starter: choices([['chatbot', 'AI chatbot'], ['web', 'My first AI web application'], ['agents', 'Simple AI automation project'], ['unsure', 'Not Sure Yet']]),
  client: choices([
    ['client-automation', 'Client automation', 'agents'], ['marketing-assistant', 'AI marketing assistant', 'web'],
    ['client-chatbot', 'AI chatbot for clients', 'chatbot'], ['content-workflow', 'AI content workflow', 'agents'], ['unsure', 'Not Sure Yet'],
  ]),
  operations: choices([
    ['support-automation', 'Customer support automation', 'agents'], ['internal-workflow', 'Internal workflow automation', 'agents'],
    ['business-knowledge', 'Business knowledge assistant', 'rag'], ['custom-business', 'Custom AI business tool', 'business-tools'], ['unsure', 'Not Sure Yet'],
  ]),
  professional: choices([
    ['productivity-workflow', 'AI productivity workflows', 'agents'], ['application-development', 'AI application development', 'web'],
    ['rag', 'RAG systems'], ['agents', 'AI agents'], ['unsure', 'Not Sure Yet'],
  ]),
};
export function getInterestOptions(profile) {
  const intent = goalIntent(profile);
  if (!intent) return [];
  if (intent === 'services' || profile.role === 'freelancer') return interests.client;
  if (profile.role === 'professional') return interests.professional;
  if (intent === 'operations' || profile.role === 'business') return interests.operations;
  return intent === 'scratch' ? interests.starter : interests.student;
}
export const interestIntent = (profile) => getInterestOptions(profile).find((option) => option.value === profile.interest)?.intent;

const concernLabels = {
  coding: "I don't know coding", difficulty: 'Technical difficulty', career: 'Career outcomes',
  value: 'Course investment and affordability', access: 'Course access duration', starting: 'Which AI skills to learn first',
  portfolio: 'Building portfolio projects', 'business-relevance': 'Business relevance', implementation: 'Implementation effort',
  time: 'Available study time', 'learning-development': 'Learning AI development', 'client-application': 'Applying skills to client projects',
};
export function getConcernOptions(profile) {
  if (!Object.hasOwn(roleGoals, profile.role)) return [];
  const intent = goalIntent(profile);
  let ids;
  if (profile.role === 'business') ids = ['difficulty', 'business-relevance', 'implementation', 'time', 'value', 'access', 'coding', 'starting'];
  else if (profile.role === 'freelancer') ids = ['learning-development', 'client-application', 'difficulty', 'time', 'value', 'access', 'coding', 'starting'];
  else if (profile.role === 'professional') ids = ['learning-development', 'time', 'implementation', 'value', 'access', 'difficulty', 'coding', 'starting'];
  else ids = ['coding', 'portfolio', 'career', 'value', 'access', 'difficulty', 'starting', 'time'];
  const priority = [];
  if (['low', 'unsure'].includes(profile.time)) priority.push('time');
  if (['beginner', 'tools'].includes(profile.experience)) priority.push('coding');
  if (intent === 'career') priority.push('career');
  if (intent === 'portfolio') priority.push('portfolio');
  // Preserve every relevant base choice while prioritising the current goal/constraints.
  return [...new Set([...priority, ...ids])].map((value) => ({ value, label: concernLabels[value] }));
}
