import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaults,workshopDefaults,withInterventions,generate,validate,normalize,selectionDefaults} from '../engine.mjs';
import {workshopDefaults as englishDefaults} from '../en/engine.mjs';
import {chanceSelection,presetSelection,setIngredientWeight} from '../weights.mjs';
import {validateTransfer} from '../transfer.mjs';
test('qualities are expressed through a selected physical intervention in both languages',()=>{
 for(const s of [workshopDefaults,englishDefaults]){
  const result=generate(s);
  for(let i=0;i<s.lines;i++){
   const draws=result.trace.filter(t=>t.row===i+1);assert.equal(draws.length,4);
   assert.ok(result.lines[i].includes(draws[2].item)&&result.lines[i].includes(draws[3].item));
   assert.match(result.lines[i],/karakter door|character by/);
  }
 }
});
test('adding the how collection preserves authored data and all original seeded choices',()=>{
 const original=structuredClone(defaults);original.challenge='My own challenge';original.selections[0]=presetSelection('last',original.selections[0]);
 const snapshot=structuredClone(original),extended=withInterventions(original);
 assert.deepEqual(original,snapshot);assert.deepEqual(extended.groups.slice(0,3),original.groups);assert.deepEqual(extended.selections.slice(0,3),original.selections);assert.equal(extended.challenge,original.challenge);
 assert.deepEqual(generate(extended).trace.filter(t=>t.group<3),generate(original).trace);
 assert.deepEqual(withInterventions(extended),extended);
});
test('changing D changes only its draws and accepts participant-written interventions',()=>{
 const s=structuredClone(workshopDefaults),before=generate(s);s.groups[3]=['geluid te dempen met zachte muren','licht te bundelen in een lage nis'];s.selections[3]={...structuredClone(selectionDefaults)};
 s.selections[3]=chanceSelection(s.groups[3],s.selections[3],1,100);
 const after=generate(s);assert.ok(after.trace.filter(t=>t.group===3).every(t=>t.item===s.groups[3][1]));assert.deepEqual(after.trace.filter(t=>t.group<3),before.trace.filter(t=>t.group<3));
 assert.ok(after.lines.every(line=>line.includes('licht te bundelen in een lage nis')));
 assert.equal(setIngredientWeight(s,3,0,5).selections[3].weights[0],5);
});
test('four collections and their selection methods survive saving and transfer',()=>{
 const s=structuredClone(workshopDefaults);s.selections[3]=presetSelection('last',s.selections[3]);
 const restored=normalize(JSON.parse(JSON.stringify(s)));assert.deepEqual(generate(restored),generate(s));
 const transfer=validateTransfer({version:1,system:s,baselineSystem:structuredClone(defaults)});assert.equal(transfer.system.groups.length,4);assert.equal(transfer.baselineSystem.groups.length,3);assert.equal(transfer.system.selections[3].direction,'end');
 const invalid=structuredClone(s);invalid.template='{A} {B} {C}';assert.throws(()=>validate(invalid),/\{D\}/);
 assert.doesNotThrow(()=>generate(defaults));
});
