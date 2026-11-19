import {test} from 'node:test';
import assert from 'node:assert/strict';
import {associationRoutes,associateThree} from '../associations.mjs';
import {associateThree as associateEnglish} from '../en/associations.mjs';
import {workshopDefaults,generate,upgradeTemplate} from '../engine.mjs';
import {localAnalysis} from '../analysis.mjs';
import {exampleText} from '../example.mjs';
import {validateTransfer} from '../transfer.mjs';
test('every authored route has exactly three distinct association steps and an interpretation',()=>{
 for(const route of associationRoutes){assert.equal(route.steps.length,3);assert.equal(new Set(route.steps).size,3);assert.ok(route.detail.length>60);}
 const a=associateThree('een ronde bank',()=>0);assert.equal(a.chain.length,4);assert.equal(new Set(a.chain).size,4);assert.equal(a.chain[0],'bank');assert.equal(a.chain[3],'paddenstoel');
 assert.deepEqual(associateEnglish('a round bench',()=>0).chain,['bench','park','forest','mushroom']);
});
test('pressing randomness again chooses a different authored route when available',()=>{
 for(const word of ['bank','tafel','verhaal','vraag','rustig','speels','bouwen','energie','geluid','contact','water']){
  const a=associateThree(word,()=>0),b=associateThree(word,()=>0,a);assert.notDeepEqual(a.chain,b.chain,word);
 }
 assert.throws(()=>associateThree('unknownword123',()=>0),/startwoord/);
});
test('association becomes a design element while original selections stay identical',()=>{
 const before=structuredClone(workshopDefaults),after=structuredClone(before);after.unexpected.association=associateThree('bank',()=>0);
 const a=generate(before),b=generate(after);assert.deepEqual(b.trace,a.trace);assert.ok(b.lines.every((line,i)=>line.startsWith(after.unexpected.association.detail)&&line.endsWith(a.lines[i])));
 assert.deepEqual(validateTransfer({version:1,system:after,baselineSystem:before}).system.unexpected.association,after.unexpected.association);
});
test('default solutions are one sentence longer and obsolete advice is removed',()=>{
 assert.equal(generate(workshopDefaults).lines[0].match(/[.!?](?:\s|$)/g).length,4);
 const a=localAnalysis(exampleText);assert.equal(a.template.match(/[.!?](?:\s|$)/g).length,5);assert.doesNotMatch(a.template,/Test met/);
 assert.equal(upgradeTemplate('{A}. {B}. {C}. Test met gebruikers of deze inrichting het verwachte gedrag ondersteunt.'),'{A}. {B}. {C}.');
});
