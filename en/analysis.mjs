import {buildFbsPrompt} from './fbs-prompt.mjs?v=b8707031bfc5';
import {extractFbs,validateAnalysisRelations} from './fbs-analysis.mjs?v=b8707031bfc5';
import {validateRelations} from './relations.mjs?v=b8707031bfc5';
import {validateExperiments,relationKey} from './experiments.mjs?v=b8707031bfc5';
import {defaults,selectionDefaults,validate} from './engine.mjs?v=b8707031bfc5';
export const maxSourceLength=50000;
const stop=new Set(('de het een en of maar want dat dit die deze er hier daar is zijn was waren wordt worden met voor van aan op in om te tot uit bij door over als dan ook nog niet wel geen zich ik je jij we wij ze zij hij haar hem hun ons onze mijn jouw uw the a an and or but that this these those is are was were be been being with for from to at on in by as it its i you we they he she my our your their not no so can could should would has have had do does did').split(' '));
export function checkSource(source){if(typeof source!=='string'||source.trim().length<20)throw Error("Enter at least 20 characters of source text.");if(source.length>maxSourceLength)throw Error("Use a source fragment of no more than 50,000 characters.");return source.trim();}
export function localAnalysis(source){source=checkSource(source);const tokens=[...source.matchAll(/[\p{L}][\p{L}\p{M}'’-]*/gu)];const words=new Map(),pairs=new Map();
 const content=word=>word.length>2&&!stop.has(word.toLocaleLowerCase('en'));
 function add(map,key,text,quote){const old=map.get(key);if(old)old.count++;else map.set(key,{text,quote,count:1,weight:1});}
 const context=(a,b)=>source.slice(Math.max(0,a-45),Math.min(source.length,b+55)).trim();
 for(const t of tokens)if(content(t[0])){const word=t[0].toLocaleLowerCase('en');add(words,word,word,context(t.index,t.index+t[0].length));}
 const ranked=m=>[...m.values()].sort((a,b)=>b.count-a.count||a.text.localeCompare(b.text,'en')).slice(0,8);
 const vocabulary=new Set([...words.entries()].sort((a,b)=>b[1].count-a[1].count).slice(0,32).map(([key])=>key));
 for(const sentence of source.matchAll(/[^.!?\n]+[.!?]?/gu)){
  const terms=[...sentence[0].matchAll(/[\p{L}][\p{L}\p{M}'’-]*/gu)].filter(t=>content(t[0]));const seen=new Set();
  for(let i=0;i<terms.length;i++)for(let j=i+1;j<Math.min(terms.length,i+5);j++){
   const a=terms[i][0].toLocaleLowerCase('en'),b=terms[j][0].toLocaleLowerCase('en');if(a===b||!vocabulary.has(a)||!vocabulary.has(b))continue;
   const names=[a,b].sort(),key=JSON.stringify(names);if(seen.has(key))continue;seen.add(key);
   add(pairs,key,names.join(' ↔ '),context(sentence.index+terms[i].index,sentence.index+terms[j].index+terms[j][0].length));
  }
 }
 const fbs=extractFbs(source);
 return {...fbs,method:'local',statistics:{words:ranked(words),cooccurrences:ranked(pairs)},template:"Build the proposal around {C}. The intended use: {B}. The aim is {A}. Test with users whether this arrangement supports the expected behaviour.",rule:null};
}
export function parseAnalysis(text){if(typeof text!=='string'||text.length>250000)throw Error("The analysis is too large.");const cleaned=text.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');let a;try{a=JSON.parse(cleaned);}catch{throw Error("Paste only the JSON response, optionally including code-block markers.");}
 if(!a||!Array.isArray(a.collections)||a.collections.length!==3)throw Error("The analysis must contain exactly three collections.");
 for(const c of a.collections){if(typeof c.label!=='string'||!c.label.trim()||c.label.length>100||!Array.isArray(c.items)||!c.items.length||c.items.length>30)throw Error("Each collection needs a name and 1–30 items.");for(const item of c.items)if(typeof item.text!=='string'||!item.text.trim()||item.text.length>500||typeof item.quote!=='string'||!item.quote.trim()||item.quote.length>1000||!Number.isFinite(item.weight)||item.weight<0||item.weight>1000000)throw Error("Each item needs text, a literal quote and a weight from 0 to 1000000.");}
 for(const c of a.collections)if(!c.items.some(i=>i.weight>0))throw Error("Each collection needs at least one positive weight.");
 if(typeof a.template!=='string'||a.template.length>2000||!['{A}','{B}','{C}'].every(x=>a.template.includes(x)))throw Error("The template must contain {A}, {B} and {C}.");
 if(a.rule!=null&&(typeof a.rule.trigger!=='string'||!Array.isArray(a.rule.allowed)||a.rule.allowed.some(x=>typeof x!=='string')||typeof a.rule.reason!=='string'||a.rule.reason.length>1500))throw Error("Invalid rule: use trigger, allowed and reason.");
 return {method:'chatgpt',collections:a.collections.map(c=>({label:c.label,items:c.items.map(i=>({text:i.text,quote:i.quote,weight:i.weight}))})),template:a.template,rule:a.rule||null,framework:a.framework==='fbs'?'fbs':'custom',relations:validateAnalysisRelations(a.relations,a.collections),experiments:validateExperiments(a.experiments).map(e=>e.kind==='loosen'&&e.relationIndex!==undefined&&a.relations?.[e.relationIndex]?{...e,relationKey:relationKey(a.relations[e.relationIndex])}:e)};
}
export function quoteExists(source,quote){return typeof quote==='string'&&quote.length>0&&source.includes(quote);}
export function buildPrompt(source,challenge){source=checkSource(source);return buildFbsPrompt(source,challenge,localAnalysis(source).statistics);}
export function systemFromReview({challenge,collections,template,rule=null,enableRule=false,seed=42,framework='custom',relations=[],relationsEnabled=false}){const s={...structuredClone(defaults),challenge,framework,relations:structuredClone(relations),relationsEnabled,labels:collections.map(c=>c.label),groups:collections.map(c=>c.items.map(i=>i.text)),selections:collections.map(c=>({...structuredClone(selectionDefaults),model:'custom',weights:c.items.map(i=>i.weight)})),template,seed,rule:{enabled:enableRule,trigger:rule?.trigger||'',allowed:rule?.allowed||[]}};return validate(s);}
