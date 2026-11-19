import {test} from 'node:test';
import assert from 'node:assert/strict';
import {workshopDefaults,generate,normalize} from '../engine.mjs';
import {localAnalysis} from '../analysis.mjs';
import {exampleText} from '../example.mjs';
test('solutions retain concrete detail without testing advice',()=>{
 assert.equal(generate(workshopDefaults).lines[0].match(/[.!?](?:\s|$)/g).length,4);
 const a=localAnalysis(exampleText);assert.equal(a.template.match(/[.!?](?:\s|$)/g).length,5);assert.doesNotMatch(a.template,/Test met/);
});
test('retired association settings do not change proposals and are removed on import',()=>{
 const s=structuredClone(workshopDefaults);s.unexpected.association={enabled:true,source:'bank',chain:['bank','park','bos','paddenstoel'],detail:'Retired association content.'};
 assert.deepEqual(generate(s),generate(workshopDefaults));assert.equal(normalize(s).unexpected.association,undefined);
});
