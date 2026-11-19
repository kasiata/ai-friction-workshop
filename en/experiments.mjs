import {validate,distribution,generate} from './engine.mjs?v=8e0f9243102d';
export function validateExperiments(items){
 if(items==null)return [];
 if(!Array.isArray(items)||items.length>3)throw Error("Use no more than three experiment suggestions.");
 return items.map(item=>{
  if(!item||!['amplify','loosen','combine'].includes(item.kind)||typeof item.title!=='string'||!item.title.trim()||item.title.length>100||typeof item.why!=='string'||!item.why.trim()||item.why.length>600)throw Error("An experiment needs a type, title and brief reason.");
  const result={kind:item.kind,title:item.title,why:item.why};
  if(item.kind==='amplify'){
   if(!Number.isInteger(item.collection)||item.collection<0||item.collection>2||typeof item.item!=='string'||!item.item.trim()||item.item.length>500||!Number.isFinite(item.weight)||item.weight<1||item.weight>1000)throw Error("Invalid suggestion for amplifying an ingredient.");
   Object.assign(result,{collection:item.collection,item:item.item,weight:item.weight});
  }
  if(item.kind==='combine'){
   if(!Number.isInteger(item.collection)||item.collection<0||item.collection>2||!Array.isArray(item.items)||item.items.length!==2||item.items.some(x=>typeof x!=='string'||!x.trim()||x.length>500)||item.items[0]===item.items[1]||typeof item.text!=='string'||!item.text.trim()||item.text.length>500)throw Error("Invalid suggestion for combining two ingredients.");
   Object.assign(result,{collection:item.collection,items:[...item.items],text:item.text});
  }
  return result;
 });
}
export function localExperiments(analysis){
 const candidates=analysis.collections.flatMap((c,group)=>c.items.map(item=>({item,group}))).sort((a,b)=>(a.item.count??1)-(b.item.count??1));
 const rare=candidates[0];const group=analysis.collections[2].items.length>=2?2:analysis.collections.findIndex(c=>c.items.length>=2);
 const pair=group>=0?analysis.collections[group].items.slice(0,2).map(i=>i.text):[];
 const suggestions=[{kind:'amplify',title:"Give the overlooked more room",why:"Temporarily give one ingredient more probability. Which direction becomes more visible?",collection:rare.group,item:rare.item.text,weight:Math.min(1000,Math.max(3,rare.item.weight*3))},
 {kind:'loosen',title:"Loosen a connection",why:"Disable the dependency between B and C. What combinations become possible?"}];
 if(pair.length===2&&pair[0]!==pair[1])suggestions.push({kind:'combine',title:"Bring two ingredients together",why:"Combine two existing ingredients into a new possibility. Decide for yourself whether the pairing creates tension.",collection:group,items:pair,text:(pair[0]+' + '+pair[1]).slice(0,500)});
 return validateExperiments(suggestions);
}
export function applyExperiment(system,experiment){
 validate(system);const [e]=validateExperiments([experiment]);const next=structuredClone(system);
 if(e.kind==='amplify'){
  const group=next.groups[e.collection],index=group.indexOf(e.item);if(index<0)throw Error("This ingredient was changed or removed. Choose another suggestion.");
  const probabilities=distribution(group,next.selections[e.collection]);const weights=next.selections[e.collection].model==='custom'?[...next.selections[e.collection].weights]:probabilities.map(p=>p*group.length);
  if(weights[index]===e.weight)throw Error("This suggestion does not change the weight. Choose another weight.");weights[index]=e.weight;next.selections[e.collection]={...next.selections[e.collection],model:'custom',weights};const changed=distribution(group,next.selections[e.collection]);if(changed.every((p,i)=>Math.abs(p-probabilities[i])<1e-12))throw Error("This intervention does not change the probabilities. Add another ingredient or edit the suggestion.");
 }
 if(e.kind==='loosen'){
  if(!next.rule.enabled)throw Error("B and C are already independent. There is no active rule to loosen.");
  next.rule.enabled=false;
 }
 if(e.kind==='combine'){
  const group=next.groups[e.collection];if(e.items.some(text=>!group.includes(text)))throw Error("One of these ingredients was changed or removed.");
  if(group.includes(e.text))throw Error("This combination is already in the collection.");
  const probabilities=distribution(group,next.selections[e.collection]);next.selections[e.collection]={...next.selections[e.collection],model:'custom',weights:[...(next.selections[e.collection].model==='custom'?next.selections[e.collection].weights:probabilities.map(p=>p*group.length)),1]};group.push(e.text);
 }
 validate(next);generate(next);return next;
}
export function experimentAvailable(system,experiment){try{applyExperiment(system,experiment);return {available:true,reason:''};}catch(error){return {available:false,reason:error.message};}}
export function compareExperiment(before,after){const a=structuredClone(before),b=structuredClone(after);a.fixedRandomness=b.fixedRandomness=true;b.seed=a.seed;return {before:generate(a),after:generate(b),system:b};}
