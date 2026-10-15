import test from 'node:test';
import assert from 'node:assert/strict';
import { recommend, getQuestion } from '../src/assessment.js';
import { ROADMAP_DISCLAIMER } from '../src/learning-roadmap.js';
import mapping from '../../data/skills_mapping.json' with {type:'json'};
import { faqs } from '../src/faq.js';

const busy={role:'college',goal:'scratch',experience:'beginner',interest:'chatbot',time:'low',concern:'access'};
const roadmap=profile=>recommend(profile).roadmap;
test('V01: a low-time beginner receives a small chatbot plan and visible verified access/workload',()=>{
  const r=roadmap(busy);
  assert.equal(r.months.length,3);
  assert.deepEqual(r.months[0].topics.map(t=>t.title),['AI & Product Foundations','AI-Assisted Development']);
  assert.match(r.months[0].activity,/one concept or exercise/);
  assert.match(r.months[1].activity,/local or manually checked/);
  assert.equal(r.months[2].focus,'Campus information helper');
  assert.match(r.months[2].milestone,/limited demonstration/);
  assert.match(r.time.text,/may be challenging/);
  assert.equal(r.access.answer,faqs.find(f=>f.id==='KB008').answer);
  assert.equal(r.workload.answer,faqs.find(f=>f.id==='KB015').answer);
  assert.match(r.months[0].activity,/before activation/);
  assert.equal(r.disclaimer,ROADMAP_DISCLAIMER);
});
test('portfolio student gets planning, retrieval, testing and a project walkthrough',()=>{
  const r=roadmap({...busy,role:'final-year',goal:'portfolio',experience:'basics',interest:'rag',time:'regular',concern:'career'});
  assert.ok(r.months[0].topics.some(t=>t.title==='Product Thinking & PRDs'));
  assert.ok(r.months[1].topics.some(t=>t.title==='RAG & Knowledge Layers'));
  assert.equal(r.months[2].focus,'Study-notes question answering demo');
  assert.match(r.months[2].activity,/walkthrough with sources and test notes/);
});
test('freelancer practice is client-oriented and includes supervised automation and APIs',()=>{
  const r=roadmap({...busy,role:'freelancer',goal:'services',experience:'tools',interest:'client-automation',time:'regular',concern:'value'});
  assert.match(r.months[0].activity,/fictional client brief/);
  assert.ok(r.months[1].topics.some(t=>t.title==='Agents & Automation'));
  assert.ok(r.months[1].topics.some(t=>t.title==='MCP, APIs & Integrations'));
  assert.equal(r.months[2].focus,'Client reporting draft workflow');
  assert.equal(r.priority.facts[0].id,'KB009');
});
test('business owner gets a sample workflow with a human review boundary',()=>{
  const r=roadmap({...busy,role:'business',goal:'operations',experience:'coding',interest:'support-automation',time:'regular'});
  assert.match(r.months[0].activity,/repetitive business workflow/);
  assert.equal(r.months[2].focus,'Sample enquiry triage tool');
  assert.match(r.months[2].activity,/before any operational action/);
});
test('career-switch professional gets work-reference RAG practice without a hiring promise',()=>{
  const r=roadmap({...busy,role:'professional',goal:'career',experience:'basics',interest:'rag',time:'some',concern:'career'});
  assert.match(r.months[0].activity,/replace workplace data with samples/);
  assert.equal(r.months[2].focus,'Work-reference question answering demo');
  assert.match(r.months[2].activity,/not a job, placement or salary guarantee/);
  assert.ok(r.months[1].topics.some(t=>t.title==='RAG & Knowledge Layers'));
});
test('recent graduate role has a project walkthrough starting activity',()=>{
  assert.match(roadmap({...busy,role:'fresher',goal:'career',concern:'career'}).months[0].activity,/project walkthrough/);
});
test('changing only weekly time changes activities and milestones in every month',()=>{
  const variants=['low','some','regular','high','unsure'].map(time=>roadmap({...busy,time}));
  for(let i=0;i<3;i++){
    assert.equal(new Set(variants.map(r=>r.months[i].activity)).size,5);
    assert.equal(new Set(variants.map(r=>r.months[i].milestone)).size,5);
  }
  const uncertain=variants.at(-1);
  assert.match(uncertain.time.text,/sustainable study rhythm/);
  assert.doesNotMatch(uncertain.time.text,/\d+.*hours/);
});
test('same college role and interest with career vs product goals changes topics and practical activities',()=>{
  const a=roadmap({...busy,goal:'career'}),b=roadmap({...busy,goal:'first-app'});
  assert.notDeepEqual(a.months[1].topics,b.months[1].topics);
  assert.notEqual(a.months[0].activity,b.months[0].activity);
  assert.match(a.months[0].activity,/engineering choice/);
  assert.match(b.months[0].activity,/user flow/);
});
test('experience changes real starting practice; comfortable coders and builders avoid elementary repetition',()=>{
  const variants=['beginner','tools','basics','coding','builder'].map(experience=>roadmap({...busy,experience}));
  assert.equal(new Set(variants.map(r=>r.months[0].activity)).size,5);
  assert.ok(variants[0].months[0].topics.some(t=>t.skill==='AI fundamentals'));
  for(const r of variants.slice(3))assert.ok(!r.months[0].topics.some(t=>t.skill==='AI fundamentals'));
  assert.match(variants[4].months[0].activity,/baseline test|evaluation gap/);
});
test('all offered concerns change a practical activity and preserve grounded facts',()=>{
  const profile={...busy,goal:'career',experience:'basics',time:'some'};
  const variants=getQuestion('concern',profile).options.map(({value:concern})=>roadmap({...profile,concern}));
  assert.equal(new Set(variants.map(r=>r.months.map(m=>m.activity).join(' '))).size,variants.length);
  assert.match(roadmap({...profile,concern:'coding'}).months[0].activity,/guided code example/);
  assert.match(roadmap({...profile,concern:'time'}).months[1].activity,/Remove optional features/);
  assert.equal(roadmap({...profile,concern:'value'}).priority.facts[0].answer,faqs.find(f=>f.id==='KB009').answer);
});
test('same business role and goal with different interests yields different practice projects',()=>{
  const p={...busy,role:'business',goal:'operations',experience:'coding'};
  const a=roadmap({...p,interest:'support-automation'}),b=roadmap({...p,interest:'internal-workflow'});
  assert.notEqual(a.months[2].focus,b.months[2].focus);
  assert.notEqual(a.months[2].activity,b.months[2].activity);
  assert.match(b.months[2].activity,/internal requests/);
});
test('same goal and interest across roles changes the actual discovery activity',()=>{
  const a=roadmap({...busy,goal:'portfolio',interest:'rag'}),b=roadmap({...busy,role:'final-year',goal:'portfolio',interest:'rag'});
  assert.notEqual(a.months[0].activity,b.months[0].activity);
});
test('all role/goal/interest paths and alternative goals produce only sourced curriculum references',()=>{
  let count=0;
  for(const {value:role} of getQuestion('role').options)for(const goalScope of [undefined,'other']){
    const p={...busy,role,goalScope};
    for(const {value:goal} of getQuestion('goal',p).options)for(const {value:interest} of getQuestion('interest',{...p,goal}).options){
      const profile={...p,goal,interest};profile.concern=getQuestion('concern',profile).options[0].value;
      const r=roadmap(profile);count++;
      for(const month of r.months){assert.ok(month.topics.length);for(const topic of month.topics){assert.ok(mapping.published_curriculum_skills.some(t=>t.skill===topic.skill&&t.module===topic.title));assert.equal(topic.sourceUrl,mapping.metadata.source_url);}}
      assert.equal(r.disclaimer,ROADMAP_DISCLAIMER);
    }
  }
  assert.ok(count>200);
});
test('invalid or incomplete profiles cannot show a roadmap; generation does not mutate answers',()=>{
  const p={...busy},before={...p};roadmap(p);assert.deepEqual(p,before);
  assert.equal(recommend({...p,time:undefined}),null);
  assert.equal(recommend({...p,concern:'invented'}),null);
});
