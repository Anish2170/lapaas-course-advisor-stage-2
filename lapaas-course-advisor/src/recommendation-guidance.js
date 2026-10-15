// Suggested learning plans, not claims about course outcomes or a proficiency test.
const roleContext = {
  college: 'Alongside college, build a small project you can explain and share.',
  'final-year': 'Connect your final-year learning with a focused, demonstrable project.',
  fresher: 'Use a practical build to turn your learning into work you can discuss.',
  freelancer: 'Connect your learning with a clearly scoped service or client workflow.',
  business: 'Use one real business problem as the starting point for your practice.',
  professional: 'Connect the curriculum with a work task or side project that matters to you.',
};

const goalDirections = {
  career: { title: 'Build towards your AI career', text: 'Focus on a working demo, clear documentation and explaining your engineering decisions.' },
  portfolio: { title: 'Turn your learning into a portfolio', text: 'Choose one project, build a usable version and document what you learned.' },
  scratch: { title: 'Start your AI learning journey', text: 'Begin with core concepts, then connect them to your first small application.' },
  product: { title: 'Bring your AI product idea to life', text: 'Define one user problem and build a small first version before adding features.' },
  upskill: { title: 'Build on the skills you already have', text: 'Connect AI concepts with practical development and a project you can use for practice.' },
  services: { title: 'Explore your next AI service', text: 'Prototype a useful client workflow and practise testing and explaining its value.' },
  operations: { title: 'Explore AI for your everyday workflows', text: 'Choose one repetitive task and practise a small, supervised automation.' },
};

const startingPoints = {
  beginner: { title: 'Start with the foundations', text: 'No prior coding is needed to start. Begin with AI basics, then build a simple example step by step with coding assistance.' },
  tools: { title: 'Move from using AI to building with it', text: 'Use your familiarity with AI tools as a starting point. Learn basic application structure and practise reading and adjusting small pieces of code.' },
  basics: { title: 'Put your programming basics to work', text: 'Connect what you know about code with an interface, data and one AI feature. Build and test the pieces together.' },
  coding: { title: 'Connect your coding skills with AI', text: 'Start with a small end-to-end AI application, then explore retrieval, tool integrations or automation around your chosen use case.' },
  builder: { title: 'Extend an existing AI workflow', text: 'Review the syllabus for areas you want to explore further, such as retrieval, integrations, evaluation or deployment. Use an existing project to guide your practice.' },
};

const studyRhythms = {
  low: { title: 'Keep your weekly steps small', text: 'With less than 2 hours a week, pick one short learning task and one small practice step. Plan a focused goal around the published three-month access window.' },
  some: { title: 'Build a steady weekly habit', text: 'With 2–5 hours a week, divide your time between lessons and applying one concept to your project. Keep the first version focused.' },
  regular: { title: 'Balance learning with building', text: 'With 5–10 hours a week, set aside regular sessions for lessons, project work and reviewing what you have built.' },
  high: { title: 'Make room to build and iterate', text: 'With more than 10 hours a week, combine lessons with deeper project practice, testing and improvements at your own pace.' },
  unsure: { title: 'Find a rhythm that works for you', text: 'Start by choosing a couple of manageable study slots around college or work. Adjust your pace as you learn, keeping the three-month access window in view.' },
};

export const concernGuidance = {
  coding: { title: 'You can start without coding experience', text: 'Begin with AI foundations and a small guided coding task. Practise understanding each change, and use the learner community when you have questions.', factIds: ['KB003', 'KB011'] },
  difficulty: { title: 'Make the technical parts manageable', text: 'Break your first build into an interface, sample data and one AI feature. Learn and test one part at a time, using the syllabus to choose your starting topics.', factIds: ['KB004', 'KB003'] },
  career: { title: 'Build work you can show and explain', text: 'Use your project to demonstrate how you approach a problem, test an application and explain your choices. Pair that work with your own applications and interview preparation.', factIds: ['KB006'] },
  value: { title: 'Connect the investment with a clear goal', text: 'Choose the topics and project you want to practise, then compare that plan with the listed fee and access period. Check current pricing, any tool costs and refund eligibility on the official page.', factIds: ['KB009', 'KB008', 'KB013'] },
  access: { title: 'Plan your learning around the access window', text: 'The supplied course information lists three months of access from activation. Pick a start date and a focused project that fit around your other commitments.', factIds: ['KB008'] },
  starting: { title: 'Begin with one concept and one small build', text: 'Start with AI foundations, choose a simple problem and build a first working example. The sequence here is a suggested practice plan you can adapt.', factIds: ['KB004', 'KB003'] },
  portfolio: { title: 'Give your portfolio a practical starting point', text: 'Choose one project you can demonstrate, add a short explanation of your decisions, and improve it through testing and feedback.', factIds: ['KB006', 'KB005'] },
  'business-relevance': { title: 'Start with a business task you understand', text: 'Map one repetitive workflow, choose a small part to prototype and compare the result with your current process. That gives your learning a concrete business context.', factIds: ['KB002', 'KB004'] },
  implementation: { title: 'Build the first version in small steps', text: 'Use sample inputs to build one useful part of your idea. Test it, review the outputs and connect additional tools when the first version works well.', factIds: ['KB005', 'KB015'] },
  time: { title: 'Choose a pace you can sustain', text: 'Use the suggested study rhythm as a starting point. Include hands-on practice alongside lessons and plan around the published access window.', factIds: ['KB015', 'KB008'] },
  'learning-development': { title: 'Learn development through a small application', text: 'Choose a narrow task, build a working version and test each feature as you go. Use the curriculum to connect concepts with the application you are building.', factIds: ['KB003', 'KB005'] },
  'client-application': { title: 'Practise on a realistic client example', text: 'Choose a small client use case and build a demo with fictional data. Test its outputs and prepare a clear explanation of what it does before proposing a live implementation.', factIds: ['KB004', 'KB005'] },
};

export function getLearningGuidance(profile, { goal, goalLabel, interestLabel }) {
  const direction = goalDirections[goal];
  const startingPoint = startingPoints[profile.experience];
  const rhythm = studyRhythms[profile.time];
  const focus = profile.interest === 'unsure'
    ? `Keep your first build open-ended while you explore your goal: “${goalLabel}”. Try one small example before choosing a more specific direction.`
    : `For your goal, “${goalLabel}”, use “${interestLabel}” as the theme for your first practice project. ${direction.text}`;
  return {
    headline: direction.title,
    introduction: `${roleContext[profile.role]} Your selected goal is “${goalLabel}”.`,
    suitability: {
      kind: 'start',
      title: 'You can take this course and make it your own.',
      explanation: `${direction.text} ${profile.interest === 'unsure' ? 'You can explore a few small examples before choosing your project direction.' : `Your interest in “${interestLabel}” gives you a useful theme to start with.`}`,
      nextStep: `Explore the official curriculum with “${goalLabel}” in mind. Use your suggested starting point and study rhythm to plan your practice. Review current fees and access details, then take the next step when you are ready.`,
    },
    learningPlan: [
      { id: 'experience', label: 'YOUR STARTING POINT', ...startingPoint },
      { id: 'focus', label: 'YOUR PROJECT DIRECTION', title: profile.interest === 'unsure' ? 'Explore before choosing a project' : interestLabel, text: focus },
      { id: 'time', label: 'YOUR STUDY RHYTHM', ...rhythm },
    ],
  };
}
