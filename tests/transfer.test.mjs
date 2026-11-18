import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaults,generate} from '../engine.mjs';
import {saveTransfer,takeTransfer,transferKey} from '../transfer.mjs';
import * as englishTransfer from '../en/transfer.mjs';
import {defaults as englishDefaults} from '../en/engine.mjs';
const storage=()=>{const values=new Map();return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};};
function payload(){const original=structuredClone(defaults),system=structuredClone(defaults);system.groups[0]=['mijn eigen plek'];system.labels[0]='Mijn verzameling';system.rule.enabled=true;return {version:1,system,baselineSystem:original};}
test('analysis handoff preserves edited collections, models, rules and baseline',()=>{const store=storage(),p=payload();p.system.selections[1].model='zipf';saveTransfer(store,p,'nl');const restored=takeTransfer(store,'nl');assert.deepEqual(restored,p);assert.deepEqual(generate(restored.system),generate(p.system));assert.equal(takeTransfer(store,'nl'),null);});
test('each language has a separate handoff and English transfer retains both language keys',()=>{const store=storage(),nl=payload(),en={version:1,system:structuredClone(englishDefaults),baselineSystem:structuredClone(englishDefaults)};saveTransfer(store,nl,'nl');englishTransfer.saveTransfer(store,en,'en');assert.notEqual(transferKey('nl'),transferKey('en'));assert.equal(englishTransfer.transferKey('nl'),transferKey('nl'));assert.deepEqual(takeTransfer(store,'nl'),nl);assert.deepEqual(englishTransfer.takeTransfer(store,'en'),en);});
test('invalid systems never overwrite a pending transfer',()=>{const store=storage(),good=payload();saveTransfer(store,good,'nl');const bad=payload();bad.system.groups[0]=[];assert.throws(()=>saveTransfer(store,bad,'nl'));assert.deepEqual(takeTransfer(store,'nl'),good);assert.throws(()=>saveTransfer(store,{version:1},'nl'));});
test('corrupt transfers produce an error and are not silently replaced by defaults',()=>{const store=storage();store.setItem(transferKey('nl'),'{broken');assert.throws(()=>takeTransfer(store,'nl'));assert.equal(store.getItem(transferKey('nl')),'{broken');});
test('unavailable browser storage fails explicitly',()=>{assert.throws(()=>saveTransfer({setItem(){throw new Error('storage unavailable');}},payload(),'nl'),/storage unavailable/);});
