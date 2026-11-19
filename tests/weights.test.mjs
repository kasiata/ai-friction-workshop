import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaults,distribution} from '../engine.mjs';
import {ingredientWeights,setIngredientWeight} from '../weights.mjs';
const state=()=>structuredClone(defaults);
test('direct weights renormalise their collection without changing the others',()=>{const before=state(),after=setIngredientWeight(before,0,0,5);assert.equal(ingredientWeights(after,0)[0],5);assert.equal(distribution(after.groups[0],after.selections[0])[0],5/9);assert.deepEqual(after.selections.slice(1),before.selections.slice(1));assert.equal(before.selections[0].model,'uniform');});
test('zero excludes an ingredient but cannot leave a collection with no selectable ingredient',()=>{const s=state(),zero=setIngredientWeight(s,0,0,0);assert.equal(distribution(zero.groups[0],zero.selections[0])[0],0);s.groups[0]=['only'];assert.throws(()=>setIngredientWeight(s,0,0,0));});
test('existing custom weights retain their absolute values through successive slider changes',()=>{let s=state();s.selections[0]={...s.selections[0],model:'custom',weights:[2,7,4,1,3]};for(const value of [2.1,3,4.5]){s=setIngredientWeight(s,0,0,value);assert.deepEqual(ingredientWeights(s,0),[value,7,4,1,3]);}});
test('invalid slider targets or values are rejected without mutation',()=>{const s=state(),original=structuredClone(s);for(const [g,i,w] of [[-1,0,1],[3,0,1],[0,99,1],[0,0,-1],[0,0,NaN]])assert.throws(()=>setIngredientWeight(s,g,i,w));assert.deepEqual(s,original);});

test('percentage sliders set the chosen chance and share the remainder proportionally',async()=>{
 const {chanceSelection}=await import('../weights.mjs');
 const group=['a','b','c'],selection={...state().selections[0],model:'custom',weights:[2,3,5]};
 const next=chanceSelection(group,selection,1,60),p=distribution(group,next);
 assert.ok(Math.abs(p[1]-.6)<1e-12);
 assert.ok(Math.abs(p[0]/p[2]-2/5)<1e-12);
 assert.ok(Math.abs(p.reduce((a,b)=>a+b,0)-1)<1e-12);
 assert.deepEqual(selection.weights,[2,3,5]);
});
test('sliders recover from a 100% favourite, allow zero, and reject impossible input',async()=>{
 const {chanceSelection}=await import('../weights.mjs');
 const group=['a','b','c'],selection=state().selections[0];
 const all=chanceSelection(group,selection,0,100);
 assert.deepEqual(distribution(group,all),[1,0,0]);
 const shared=chanceSelection(group,all,0,40);
 assert.deepEqual(distribution(group,shared),[.4,.3,.3]);
 assert.equal(distribution(group,chanceSelection(group,shared,1,0))[1],0);
 assert.deepEqual(distribution(['only'],chanceSelection(['only'],selection,0,100)),[1]);
 for(const [i,p] of [[-1,30],[3,50],[0,-1],[0,101],[0,NaN]])assert.throws(()=>chanceSelection(group,selection,i,p));
 assert.throws(()=>chanceSelection(['only'],selection,0,50));
});
test('automatic first and last presets mirror each other and the middle presets peak centrally',async()=>{
 const {presetSelection,selectionPresetName}=await import('../weights.mjs');
 const group=['a','b','c','d','e'],selection=state().selections[0];
 for(const [first,last] of [['first','last'],['tail-first','tail-last']]){
  const a=distribution(group,presetSelection(first,selection)),b=distribution(group,presetSelection(last,selection));
  assert.deepEqual(a.map(p=>Number(p.toFixed(12))),b.toReversed().map(p=>Number(p.toFixed(12))));assert.ok(a[0]>a[4]);assert.ok(b[4]>b[0]);
 }
 for(const name of ['middle','peak']){const p=distribution(group,presetSelection(name,selection));assert.equal(p.indexOf(Math.max(...p)),2);}
 for(const name of ['equal','first','last','middle','peak','tail-first','tail-last'])assert.equal(selectionPresetName(presetSelection(name,selection)),name);
 assert.equal(selectionPresetName({...selection,model:'custom'}),'custom');
 assert.throws(()=>presetSelection('unavailable',selection));
});
