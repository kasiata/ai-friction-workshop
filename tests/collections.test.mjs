import {test} from 'node:test';
import assert from 'node:assert/strict';
import {workshopDefaults,generate} from '../engine.mjs';
import {workshopDefaults as englishDefaults} from '../en/engine.mjs';
import {presetSelection} from '../weights.mjs';

test('exercise 1 starts with short collections and independently selected combinations',()=>{
 for(const defaults of [workshopDefaults,englishDefaults]){
  assert.equal(defaults.framework,'custom');assert.equal(defaults.relationsEnabled,false);assert.deepEqual(defaults.relations,[]);
  assert.equal(defaults.groups.length,4);assert.ok(defaults.groups.slice(0,3).every(group=>group.length===5&&group.every(item=>item.length<40)));assert.equal(defaults.groups[3].length,5);
  const result=generate(defaults);
  result.lines.forEach((line,index)=>{
   const selected=result.trace.filter(draw=>draw.row===index+1);
   assert.deepEqual(selected.map(draw=>draw.group),[0,1,2,3]);
   assert.ok(selected.every(draw=>line.includes(draw.item)&&draw.relations.length===0));
  });
 }
});
test('changing a collection selection method preserves unrelated selections and supports comparison',()=>{
 const before=structuredClone(workshopDefaults),after=structuredClone(before);
 after.selections[0]=presetSelection('last',after.selections[0]);
 const a=generate(before),b=generate(after);
 assert.ok(b.trace.filter(draw=>draw.group===0).every(draw=>draw.model==='exponential'));
 assert.deepEqual(a.trace.filter(draw=>draw.group!==0),b.trace.filter(draw=>draw.group!==0));
 assert.deepEqual(after.groups,before.groups);assert.equal(after.seed,before.seed);
});
