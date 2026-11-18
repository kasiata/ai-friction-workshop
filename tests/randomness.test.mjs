import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generationSeed} from '../randomness.mjs';
import {defaults,generate} from '../engine.mjs';

test('fixed randomness retains the current sequence without drawing a new seed',()=>{let calls=0;const draw=()=>{calls++;return 123;};const seed=generationSeed(42,true,draw);assert.equal(seed,42);assert.equal(calls,0);assert.deepEqual(generate({...defaults,seed}),generate({...defaults,seed:generationSeed(seed,true,draw)}));});
test('unfixed randomness requests a fresh seed on each generation',()=>{let value=100;const draw=()=>++value;const a=generationSeed(42,false,draw),b=generationSeed(a,false,draw);assert.equal(a,101);assert.equal(b,102);assert.notDeepEqual(generate({...defaults,seed:a}).lines,generate({...defaults,seed:b}).lines);});
test('a refreshed sequence can then be held fixed',()=>{const refreshed=generationSeed(42,false,()=>987);assert.equal(generationSeed(refreshed,true,()=>999),987);});
test('only valid unsigned seed values are accepted',()=>{for(const value of [-1,1.5,NaN,4294967296])assert.throws(()=>generationSeed(value,true,()=>42));assert.equal(generationSeed('42',true,()=>0),42);});
