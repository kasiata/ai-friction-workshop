import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fbsDefaults,defaults,validate,generate} from '../engine.mjs';
import {relationCandidates,validateRelations} from '../relations.mjs';
import {localAnalysis,systemFromReview,parseAnalysis} from '../analysis.mjs';
import {exampleText} from '../example.mjs';
import {localExperiments,applyExperiment} from '../experiments.mjs';
import {fbsDefaults as enDefaults} from '../en/engine.mjs';
import {exampleText as enExample} from '../en/example.mjs';
const fresh=()=>({...structuredClone(fbsDefaults),relationsEnabled:true});
test('enabled FBS relationships constrain behaviour by function and structure by behaviour',()=>{for(let seed=0;seed<50;seed++){const s=fresh();s.seed=seed;const result=generate(s);for(let i=0;i<result.trace.length;i+=3){const [f,b,c]=result.trace.slice(i,i+3);assert.ok(s.relations.some(r=>r.type==='realises'&&r.from.item===b.item&&r.to.item===f.item));assert.ok(s.relations.some(r=>r.type==='enables'&&r.from.item===c.item&&r.to.item===b.item));assert.ok(!s.relations.some(r=>r.type==='inhibits'&&r.from.item===c.item&&r.to.item===b.item));assert.ok(b.relations.length&&c.relations.length);}}});
test('relation switch preserves the three draw positions without applying hidden constraints',()=>{const s=fresh(),off=fresh();off.relationsEnabled=false;const a=generate(s),b=generate(off);assert.deepEqual(a.trace.filter(t=>t.group===0),b.trace.filter(t=>t.group===0));assert.ok(b.trace.every(t=>t.relations.length===0));});
test('typed requires and inhibits affect candidates and contradictions do not silently fall back',()=>{const s=fresh();s.relations=[];const b=s.groups[1][0],c=s.groups[2][0];s.groups[1]=[b];s.relations=[{type:'requires',from:{group:1,item:b},to:{group:2,item:c},enabled:true}];assert.ok(generate(s).trace.filter(t=>t.group===2).every(t=>t.item===c));s.relations.push({type:'inhibits',from:{group:2,item:c},to:{group:1,item:b},enabled:true});assert.throws(()=>generate(s),/geen kiesbaar/);});
test('invalid endpoint roles and active dangling references are rejected',()=>{const s=fresh();assert.throws(()=>validateRelations([{...s.relations[0],from:{group:2,item:s.groups[2][0]}}],s.groups),/categorie/);s.groups[2]=['nieuw'];assert.throws(()=>validate(s),/verwijderd/);s.relationsEnabled=false;assert.doesNotThrow(()=>validate(s));});
test('the worked real-solution description is substantial and yields cited FBS drafts',()=>{assert.ok(exampleText.split(/\s+/).length>300);const a=localAnalysis(exampleText);assert.equal(a.framework,'fbs');assert.ok(a.collections.every(c=>c.items.length>=2));assert.ok(a.collections.every(c=>!c.label.includes('Tekstfragmenten')));for(const c of a.collections)for(const item of c.items)assert.ok(exampleText.includes(item.quote));assert.ok(a.relations.length>0);assert.ok(a.relations.every(r=>exampleText.includes(r.quote)));const s=systemFromReview({challenge:'Onderzoek ontmoeting.',...a});assert.equal(s.relationsEnabled,false);assert.doesNotThrow(()=>generate({...s,relationsEnabled:true}));});
test('incomplete local source material is not silently replaced with invented functions',()=>{const a=localAnalysis('Een ronde bank staat naast een gedeelde tafel.');assert.equal(a.collections[0].items.length,0);assert.ok(a.collections[2].items.length>0);});
test('FBS substitutions keep function and dependencies while changing the selected role',()=>{const s=fresh(),old=s.groups[2][0];const e={kind:'replace',title:'Andere structuur',why:'Onderzoek het effect.',collection:2,item:old,replacement:'een interactief uitnodigingsbord'};const result=applyExperiment(s,e);assert.deepEqual(result.groups[0],s.groups[0]);assert.deepEqual(result.groups[1],s.groups[1]);assert.equal(result.groups[2][0],e.replacement);assert.ok(result.relations.some(r=>r.from.item===e.replacement));assert.ok(s.relations.some(r=>r.from.item===old));assert.doesNotThrow(()=>generate(result));});
test('FBS dependency experiments disable exactly one relationship and detect stale targets',()=>{const a=localAnalysis(exampleText),e=localExperiments(a).find(e=>e.kind==='loosen');const s=systemFromReview({challenge:'Ontwerp ontmoeting.',...a,relationsEnabled:true});const after=applyExperiment(s,e);assert.equal(after.relations.filter(r=>!r.enabled).length,1);const stale=structuredClone(s);stale.relations.splice(e.relationIndex,1);assert.throws(()=>applyExperiment(stale,e),/andere actieve/);});
test('legacy systems still work and FBS metadata survives analysis import',()=>{assert.doesNotThrow(()=>generate(defaults));const a=localAnalysis(exampleText),imported=parseAnalysis(JSON.stringify({...a,experiments:localExperiments(a)}));assert.equal(imported.framework,'fbs');assert.deepEqual(imported.relations,a.relations);});
test('English FBS defaults preserve the same selection semantics and English case text',()=>{assert.match(enDefaults.labels[0],/Function/);assert.ok(enExample.split(/\s+/).length>300);assert.match(enExample,/Chatter & Natter/);const a=generate(fresh()),b=generate({...enDefaults,relationsEnabled:true});assert.deepEqual(a.trace.map(t=>[t.group,t.index,t.probability]),b.trace.map(t=>[t.group,t.index,t.probability]));});
test('changing behaviour retains function and structure draws when dependencies are deliberately kept',()=>{for(let seed=0;seed<20;seed++){const s=fresh();s.seed=seed;const after=applyExperiment(s,{kind:'replace',title:'Ander gedrag',why:'Houd structuur vast.',collection:1,item:s.groups[1][0],replacement:'bezoekers tekenen samen een openingsvraag'});const a=generate(s).trace,b=generate(after).trace;for(let i=0;i<a.length;i++)if(a[i].group!==1)assert.equal(a[i].item,b[i].item);}});

test('both workshop examples generate a physical proposal with intended use and a test',()=>{
 for(const s of [fbsDefaults,enDefaults]){
  const result=generate(s);
  assert.ok(s.groups[2].every(item=>item.length>70),'structures describe an arrangement, not an isolated keyword');
  for(const line of result.lines){
   assert.ok(line.length>220);
   assert.match(line,/Test/);
   assert.doesNotMatch(line,/Vertrekpunt:|Bronfragment:|Starting point:|Source fragment:|\{[ABC]\}/);
  }
 }
});

test('the direct chance exercise starts without hidden relationship restrictions',()=>{for(const s of [fbsDefaults,enDefaults]){assert.equal(s.relationsEnabled,false);assert.ok(generate(s).trace.every(draw=>!draw.relations.length));}});
