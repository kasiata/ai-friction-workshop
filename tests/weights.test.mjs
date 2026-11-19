import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaults,distribution} from '../engine.mjs';
import {ingredientWeights,setIngredientWeight} from '../weights.mjs';
const state=()=>structuredClone(defaults);
test('direct weights renormalise their collection without changing the others',()=>{const before=state(),after=setIngredientWeight(before,0,0,5);assert.equal(ingredientWeights(after,0)[0],5);assert.equal(distribution(after.groups[0],after.selections[0])[0],5/9);assert.deepEqual(after.selections.slice(1),before.selections.slice(1));assert.equal(before.selections[0].model,'uniform');});
test('zero excludes an ingredient but cannot leave a collection with no selectable ingredient',()=>{const s=state(),zero=setIngredientWeight(s,0,0,0);assert.equal(distribution(zero.groups[0],zero.selections[0])[0],0);s.groups[0]=['only'];assert.throws(()=>setIngredientWeight(s,0,0,0));});
test('existing custom weights retain their absolute values through successive slider changes',()=>{let s=state();s.selections[0]={...s.selections[0],model:'custom',weights:[2,7,4,1,3]};for(const value of [2.1,3,4.5]){s=setIngredientWeight(s,0,0,value);assert.deepEqual(ingredientWeights(s,0),[value,7,4,1,3]);}});
test('invalid slider targets or values are rejected without mutation',()=>{const s=state(),original=structuredClone(s);for(const [g,i,w] of [[-1,0,1],[3,0,1],[0,99,1],[0,0,-1],[0,0,NaN]])assert.throws(()=>setIngredientWeight(s,g,i,w));assert.deepEqual(s,original);});
