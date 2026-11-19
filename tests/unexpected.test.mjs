import {test} from 'node:test';
import assert from 'node:assert/strict';
import {workshopDefaults,unexpectedDefaults,generate,normalize,validate} from '../engine.mjs';
import {workshopDefaults as englishDefaults} from '../en/engine.mjs';
import {chanceSelection} from '../weights.mjs';
import {validateTransfer} from '../transfer.mjs';
const state=()=>structuredClone(workshopDefaults);
test('proposals have no filler and the unexpected collection is optional',()=>{
 for(const settings of [workshopDefaults,englishDefaults]){
  assert.equal(settings.unexpected.enabled,false);
  const result=generate(settings);
  assert.ok(result.lines.every(line=>!/Zo ontstaat|This creates a concrete proposal|Onverwacht element:|Unexpected element:/.test(line)));
  assert.equal(result.surprises,undefined);
 }
});
test('unexpected elements use a separate draw stream, preserving every original selection',()=>{
 const off=state(),on=state();on.unexpected.enabled=true;
 const before=generate(off),after=generate(on);
 assert.deepEqual(after.trace,before.trace);
 assert.equal(after.surprises.length,on.lines);
 assert.ok(after.lines.every((line,i)=>line.startsWith(before.lines[i])&&line.includes(after.surprises[i].item)));
 assert.deepEqual(generate(on),after);
});
test('unexpected chances can exclude every twist except a participant-authored element',()=>{
 const s=state();s.unexpected={...structuredClone(unexpectedDefaults),enabled:true,items:['a quiet surprise','a new visitor writes the next rule']};
 s.unexpected.selection=chanceSelection(s.unexpected.items,s.unexpected.selection,1,100);
 const result=generate(s);assert.ok(result.surprises.every(draw=>draw.item===s.unexpected.items[1]&&draw.probability===1));
 assert.ok(result.lines.every(line=>line.includes(s.unexpected.items[1])));
});
test('unexpected elements and their selection method survive analysis handoff',()=>{
 const s=state();s.unexpected.enabled=true;s.unexpected.selection={...s.unexpected.selection,model:'exponential',direction:'end'};
 const transferred=validateTransfer(JSON.parse(JSON.stringify({version:1,system:s,baselineSystem:state()})));
 assert.deepEqual(transferred.system.unexpected,s.unexpected);
 assert.deepEqual(generate(transferred.system),generate(s));
 const legacy=state();delete legacy.unexpected;assert.equal(normalize(legacy).unexpected.enabled,false);
});
test('invalid enabled surprise collections fail explicitly and disabled empty collections are valid',()=>{
 const s=state();s.unexpected.enabled=true;s.unexpected.items=[];assert.throws(()=>validate(s),/onverwacht/);
 s.unexpected.enabled=false;assert.doesNotThrow(()=>generate(s));
 s.unexpected.items=['x'.repeat(501)];assert.throws(()=>validate(s),/500/);
});
