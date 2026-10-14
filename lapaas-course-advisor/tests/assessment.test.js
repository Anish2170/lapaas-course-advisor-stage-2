import test from 'node:test';
import assert from 'node:assert/strict';
import { questions, getQuestion, initialAssessment, assessmentReducer, isCompleteProfile, recommend, answerLabel, revalidateAnswers, roleGoals, otherGoals } from '../src/assessment.js';
import { faqs } from '../src/faq.js';
import mapping from '../../data/skills_mapping.json' with { type: 'json' };

const base = { role: 'college', goal: 'scratch', experience: 'beginner', interest: 'unsure', time: 'regular', concern: 'coding' };
test('assessment retains six questions; each current-context option set has unique values', () => {
  assert.deepEqual(questions.map((question) => question.id), ['role', 'goal', 'experience', 'interest', 'time', 'concern']);
  assert.deepEqual(['role', 'experience', 'time'].map((id) => getQuestion(id).options.length), [6, 5, 5]);
  for (const { id } of questions) {
    const choices = getQuestion(id, base).options;
    assert.equal(new Set(choices.map((option) => option.value)).size, choices.length);
  }
});
test('unanswered and unrecognised answers cannot advance', () => {
  assert.equal(assessmentReducer(initialAssessment, { type: 'next' }), initialAssessment);
  assert.equal(assessmentReducer(initialAssessment, { type: 'select', value: 'unrecognised' }), initialAssessment);
});
test('Back cannot leave the first step; answers survive Back/Next and can be changed', () => {
  let state = assessmentReducer(initialAssessment, { type: 'back' });
  assert.equal(state.step, 0);
  state = assessmentReducer(state, { type: 'select', value: 'college' });
  state = assessmentReducer(state, { type: 'next' });
  state = assessmentReducer(state, { type: 'select', value: 'portfolio' });
  state = assessmentReducer(state, { type: 'back' });
  assert.equal(state.answers.role, 'college');
  state = assessmentReducer(state, { type: 'select', value: 'final-year' });
  state = assessmentReducer(state, { type: 'next' });
  assert.deepEqual(state.answers, { role: 'final-year', goal: 'portfolio' });
});
test('all six valid answers are needed to finish; editing and restarting work', () => {
  let state = initialAssessment;
  questions.forEach(({ id }, index) => {
    assert.equal(state.step, index);
    state = assessmentReducer(state, { type: 'select', value: base[id] });
    state = assessmentReducer(state, { type: 'next' });
    assert.equal(state.complete, index === 5);
  });
  assert.deepEqual(state.answers, base);
  assert.equal(assessmentReducer(state, { type: 'next' }), state);
  assert.equal(assessmentReducer(state, { type: 'select', value: 'value' }), state);
  const edit = assessmentReducer(state, { type: 'edit' });
  assert.equal(edit.complete, false);
  assert.equal(edit.step, 0);
  assert.deepEqual(edit.answers, base);
  assert.deepEqual(assessmentReducer(state, { type: 'restart' }), initialAssessment);
});
test('invalid, missing and unknown profile values fail closed', () => {
  for (const profile of [undefined, null, {}, { ...base, interest: undefined }, { ...base, role: 'alien' }, { ...base, time: '__proto__' }]) {
    assert.equal(isCompleteProfile(profile), false);
    assert.equal(recommend(profile), null);
  }
  assert.equal(answerLabel('role', 'alien'), 'Not answered');
});
test('beginner recommendation starts with foundations and a small suggested project', () => {
  const result = recommend(base);
  assert.equal(result.suitability.kind, 'cautious');
  assert.equal(result.topics[0].id, 'foundations');
  assert.equal(result.project.title, 'Simple study FAQ explorer');
  assert.ok(result.considerations.some((item) => item.id === 'practice'));
});
test('portfolio student gets full-stack, coding assistance, retrieval and publishing guidance', () => {
  const result = recommend({ ...base, role: 'final-year', goal: 'portfolio', experience: 'basics', interest: 'rag', concern: 'career' });
  for (const id of ['assisted', 'fullstack', 'rag', 'shipping']) assert.ok(result.topics.some((topic) => topic.id === id));
  assert.equal(result.project.title, 'Study-notes question answering demo');
  assert.match(result.considerations.find((item) => item.id === 'concern').text, /not verified/);
});
test('freelancer gets automation, API and deployment guidance rather than a generic student project', () => {
  const result = recommend({ ...base, role: 'freelancer', goal: 'services', experience: 'tools', interest: 'unsure', concern: 'value' });
  for (const id of ['agents', 'integrations', 'shipping']) assert.ok(result.topics.some((topic) => topic.id === id));
  assert.equal(result.project.title, 'Client reporting draft workflow');
  const concern = result.considerations.find((item) => item.id === 'concern');
  assert.ok(concern.facts.some((faq) => faq.id === 'KB009'));
  assert.match(concern.text, /premium AI credits.*not verified/);
});
for (const time of ['low', 'unsure']) {
  test(`${time} time overrides favourable curriculum or advanced experience`, () => {
    for (const experience of ['beginner', 'basics', 'builder']) {
      const result = recommend({ ...base, time, experience });
      assert.equal(result.suitability.kind, time === 'low' ? 'pause' : 'clarify');
    }
  });
}
test('existing AI builders are asked to verify depth', () => {
  const result = recommend({ ...base, experience: 'builder' });
  assert.equal(result.suitability.kind, 'review');
  assert.match(result.suitability.explanation, /does not establish the depth/);
});
test('working professionals get an explicit audience caveat', () => {
  const result = recommend({ ...base, role: 'professional', goal: 'upskill' });
  assert.ok(result.considerations.some((item) => item.id === 'audience' && item.facts[0].id === 'KB002'));
});
test('business owners get operational workflow guidance without savings promises', () => {
  const result = recommend({ ...base, role: 'business', goal: 'operations', experience: 'coding', interest: 'support-automation', concern: 'access' });
  assert.equal(result.project.title, 'Sample enquiry triage tool');
  assert.ok(result.topics.some((topic) => topic.id === 'agents'));
  assert.ok(result.topics.some((topic) => topic.id === 'planning'));
  assert.match(result.considerations.find((item) => item.id === 'outcomes').text, /business savings.*not guaranteed/);
});
test('changing answers recomputes guidance and does not mutate previous output', () => {
  const first = recommend(base);
  const copy = structuredClone(first);
  const second = recommend({ ...base, time: 'low', goalScope: 'other', goal: 'services', experience: 'coding', interest: 'client-automation' });
  assert.equal(second.suitability.kind, 'pause');
  assert.equal(second.project.title, 'Client reporting draft workflow');
  assert.deepEqual(first, copy);
});
test('every concern produces its own guidance and sourced supporting facts', () => {
  for (const { value } of getQuestion('concern', base).options) {
    const result = recommend({ ...base, concern: value });
    const concern = result.considerations.find((item) => item.id === 'concern');
    assert.ok(concern.title && concern.text && concern.facts.length);
    concern.facts.forEach((fact) => assert.deepEqual(fact, faqs.find((faq) => faq.id === fact.id)));
  }
});

test('all adaptive profiles in both goal modes: sourced modules, exact FAQ facts, conditional guidance and no invented outcome scores', () => {
  let count = 0;
  function verify(index, profile) {
    if (index < questions.length) {
      const question = questions[index];
      const contexts = index === 1 ? [profile, { ...profile, goalScope: 'other' }] : [profile];
      for (const context of contexts) for (const { value } of getQuestion(question.id, context).options) verify(index + 1, { ...context, [question.id]: value });
      return;
    }
    const result = recommend(profile);
    count++;
    assert.ok(result && result.suitability.kind && result.suitability.nextStep);
    assert.equal(result.profile.length, 6);
    assert.ok(result.profile.every((item) => item.answer && item.answer !== 'Not answered'));
    assert.ok(result.goal && result.goal !== 'Not answered');
    assert.ok(result.project.title && result.project.description);
    assert.equal(result.officialUrl, 'https://cohort.lapaas.com/');
    assert.equal(new Set(result.topics.map((topic) => topic.id)).size, result.topics.length);
    for (const topic of result.topics) {
      assert.ok(mapping.published_curriculum_skills.some((skill) => skill.module === topic.title && skill.skill === topic.publishedSkill));
      assert.equal(topic.sourceUrl, mapping.metadata.source_url);
      assert.ok(topic.reasons.length);
    }
    for (const fact of [...result.facts, ...result.considerations.flatMap((item) => item.facts)]) {
      assert.deepEqual(fact, faqs.find((faq) => faq.id === fact.id));
    }
    assert.match(result.project.label, /Suggested practice project.*not a guaranteed course assignment/);
    const output = JSON.stringify(result);
    assert.doesNotMatch(output, /\d+\s*%|readinessScore|suitabilityScore|matchPercentage|20 LPA|lifetime access|free AI credits/i);
    assert.doesNotMatch(output, /(?:Lapaas|the course|we) (?:guarantees|promises) (?:a job|placement|income|completion)/i);
    assert.match(result.considerations.find((item) => item.id === 'outcomes').text, /not guaranteed/);
    if (profile.time === 'low') assert.equal(result.suitability.kind, 'pause');
    else if (profile.time === 'unsure') assert.equal(result.suitability.kind, 'clarify');
    else if (profile.experience === 'builder') assert.equal(result.suitability.kind, 'review');
  }
  verify(0, {});
  assert.ok(count > 32400);
  console.log(`Adaptive profiles verified: ${count}`);
});

test('all six roles have exactly the requested five tailored goals and alternative-goal access', () => {
  const expected = {
    college: ['Get an AI internship', 'Build portfolio projects', 'Learn AI from scratch', 'Build my first AI application', 'Explore AI career opportunities'],
    'final-year': ['Prepare for AI jobs or internships', 'Build an impressive portfolio', 'Learn practical AI development', 'Build a complete AI product', 'Improve technical skills before graduation'],
    fresher: ['Prepare for an AI development career', 'Build job-relevant AI projects', 'Improve my technical portfolio', 'Learn AI product engineering', 'Explore freelancing opportunities'],
    freelancer: ['Offer AI services to clients', 'Automate client workflows', 'Build AI marketing tools', 'Create AI-powered products', 'Improve my freelancing skills'],
    business: ['Automate repetitive business operations', 'Build AI tools for my business', 'Improve business efficiency', 'Reduce manual workload using AI', 'Develop my own AI-powered product'],
    professional: ['Upgrade my current skills with AI', 'Switch to an AI-related career', 'Automate repetitive work tasks', 'Build AI applications', 'Start an AI side project'],
  };
  for (const [role, labels] of Object.entries(expected)) {
    assert.deepEqual(getQuestion('goal', { role }).options.map((option) => option.label), labels);
    assert.deepEqual(getQuestion('goal', { role, goalScope: 'other' }).options, otherGoals);
  }
  assert.ok(!roleGoals.business.some((goal) => goal.value === 'career'));
});
test('interest choices depend on both role and the actual goal', () => {
  const sets = [
    [{ role: 'final-year', goal: 'portfolio' }, ['AI chatbot', 'RAG application', 'Full-stack AI application', 'AI automation project', 'Not Sure Yet']],
    [{ role: 'freelancer', goal: 'services' }, ['Client automation', 'AI marketing assistant', 'AI chatbot for clients', 'AI content workflow', 'Not Sure Yet']],
    [{ role: 'business', goal: 'operations' }, ['Customer support automation', 'Internal workflow automation', 'Business knowledge assistant', 'Custom AI business tool', 'Not Sure Yet']],
    [{ role: 'professional', goal: 'upskill' }, ['AI productivity workflows', 'AI application development', 'RAG systems', 'AI agents', 'Not Sure Yet']],
  ];
  sets.forEach(([profile, labels]) => assert.deepEqual(getQuestion('interest', profile).options.map((option) => option.label), labels));
  assert.ok(!getQuestion('interest', { role: 'college', goal: 'scratch' }).options.some((option) => option.value === 'rag'));
  assert.ok(getQuestion('interest', { role: 'college', goal: 'portfolio' }).options.some((option) => option.value === 'rag'));
  assert.deepEqual(getQuestion('interest', { role: 'business', goal: 'career' }).options, []);
});
test('experience and time choices stay identical across roles', () => {
  for (const role of Object.keys(roleGoals)) for (const id of ['experience', 'time']) {
    assert.deepEqual(getQuestion(id, { role }).options, getQuestion(id, {}).options);
  }
});
test('role change clears incompatible goals/interests/concerns and preserves independent experience/time', () => {
  const business = { role: 'business', goal: 'operations', experience: 'coding', interest: 'internal-workflow', time: 'regular', concern: 'business-relevance' };
  const state = { step: 0, answers: business, complete: false };
  const changed = assessmentReducer(state, { type: 'select', value: 'college' });
  assert.deepEqual(changed.answers, { role: 'college', experience: 'coding', time: 'regular' });
  assert.match(changed.notice, /cleared/);
  assert.equal(recommend(changed.answers), null);
  const next = assessmentReducer(changed, { type: 'next' });
  assert.equal(next.step, 1);
  assert.equal(assessmentReducer(next, { type: 'next' }), next);
  assert.deepEqual(state.answers, business);
});
test('shared goals/interests retain their meaning but use the new role-specific labels', () => {
  const changed = assessmentReducer({ step: 0, complete: false, answers: { ...base, goal: 'portfolio', interest: 'rag' } }, { type: 'select', value: 'final-year' });
  assert.equal(changed.answers.goal, 'portfolio');
  assert.equal(changed.answers.interest, 'rag');
  assert.equal(answerLabel('goal', 'portfolio', changed.answers), 'Build an impressive portfolio');
});
test('goal change clears project interests unavailable in the new flow', () => {
  const changed = assessmentReducer({ step: 1, complete: false, answers: { ...base, goal: 'portfolio', interest: 'rag' } }, { type: 'select', value: 'scratch' });
  assert.equal(changed.answers.interest, undefined);
  assert.equal(changed.answers.experience, 'beginner');
  assert.equal(changed.answers.time, 'regular');
  assert.equal(changed.answers.concern, 'coding');
});
test('changing a goal clears a concern that is no longer offered', () => {
  const changed = assessmentReducer({ step: 1, complete: false, answers: { ...base, role: 'professional', goal: 'career', interest: 'rag', concern: 'career' } }, { type: 'select', value: 'upskill' });
  assert.equal(changed.answers.concern, undefined);
  assert.equal(changed.answers.interest, 'rag');
});
test('alternative goals work for all roles, and switching back rejects hidden selections', () => {
  for (const role of Object.keys(roleGoals)) {
    let state = { step: 1, complete: false, answers: { ...base, role } };
    state = assessmentReducer(state, { type: 'goal-scope', value: 'other' });
    state = assessmentReducer(state, { type: 'select', value: 'services' });
    const profile = { ...state.answers, interest: 'client-automation', concern: 'value' };
    assert.ok(recommend(profile));
    assert.equal(recommend(profile).goal, 'Offer AI services to clients');
  }
  const changed = assessmentReducer({ step: 1, complete: false, answers: { ...base, role: 'business', goalScope: 'other', goal: 'career', interest: 'business-knowledge' } }, { type: 'goal-scope', value: 'role' });
  assert.equal(changed.answers.goal, undefined);
  assert.equal(changed.answers.interest, undefined);
  assert.equal(changed.answers.goalScope, undefined);
});
test('alternative goal intent stays visible and valid after a role change', () => {
  const changed = assessmentReducer({ step: 0, complete: false, answers: { ...base, role: 'business', goalScope: 'other', goal: 'operations', interest: 'internal-workflow', concern: 'time' } }, { type: 'select', value: 'college' });
  assert.equal(changed.answers.goalScope, 'other');
  assert.equal(changed.answers.goal, 'operations');
  assert.ok(recommend(changed.answers));
});
test('hidden or forged combinations cannot produce a recommendation', () => {
  for (const profile of [
    { ...base, role: 'business', goal: 'career' }, { ...base, goal: 'services' },
    { ...base, goalScope: 'unexpected' }, { ...base, interest: 'internal-workflow' },
    { ...base, role: 'business', goal: 'operations', interest: 'internal-workflow', concern: 'career' },
  ]) assert.equal(recommend(profile), null);
  assert.deepEqual(revalidateAnswers({ ...base, injected: 'ignored' }), base);
});
test('defensive final submission redirects an outdated profile to its first missing question', () => {
  const next = assessmentReducer({ step: 5, complete: false, answers: { ...base, role: 'business', goal: 'career', interest: 'internal-workflow', concern: 'value' } }, { type: 'next' });
  assert.equal(next.complete, false);
  assert.equal(next.step, 1);
  assert.equal(next.answers.goal, undefined);
  assert.equal(next.answers.interest, undefined);
  assert.equal(next.answers.experience, 'beginner');
  assert.equal(next.answers.time, 'regular');
});
test('concerns prioritise time, coding, goal and role context without discarding still-valid choices', () => {
  assert.equal(getQuestion('concern', { ...base, time: 'low' }).options[0].value, 'time');
  assert.equal(getQuestion('concern', base).options[0].value, 'coding');
  assert.equal(getQuestion('concern', { ...base, goal: 'portfolio', experience: 'basics' }).options[0].value, 'portfolio');
  assert.ok(getQuestion('concern', { ...base, role: 'business', goal: 'operations' }).options.some((option) => option.value === 'business-relevance'));
});
