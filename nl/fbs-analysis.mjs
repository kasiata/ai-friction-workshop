import {validateRelations} from './relations.mjs?v=2bee8638922a';
export function extractFbs(source){
 const sentences=[...source.matchAll(/[^.!?\n]+[.!?]?/gu)].map(m=>({text:m[0].trim(),start:m.index})).filter(s=>s.text.length>10);
 const groups=[[],[],[]],seen=[new Set(),new Set(),new Set()];
 function add(group,text,quote){text=text.trim().replace(/[.!?]$/,'').trim().slice(0,350);const key=text.toLocaleLowerCase('nl');if(text.length<4||seen[group].has(key)||groups[group].length>=(group===2?60:8))return;seen[group].add(key);groups[group].push({text,quote:quote.slice(0,1000),weight:1});}
 for(const {text} of sentences){
  const f=text.match(/(?:doel|bedoeling|functie)\s+is\s+(?:om\s+)?(.+)/i)||text.match(/(?:aim|purpose|goal)\s+is\s+(?:to\s+)?(.+)/i)||text.match(/(?:bedoeld om|intended to)\s+(.+)/i);if(f)add(0,f[1],text);
  if(/bezoeker|deelnemer|vrijwilliger|gastheer|gastvrouw|visitor|participant|volunteer|people|host/i.test(text)&&/zien|herkennen|schuiven|beginnen|verwelkom|helpt|terugkomen|ontmoeten|see|recognis|join|start|welcome|help|return|meet/i.test(text)&&!f&&!text.endsWith('?'))add(1,text,text);
  const terms=text.match(/(?:herkenbaar tafelbord|aangewezen gesprekstafel|gesprekstafel|tafelbord|vrijwillige gastheer of gastvrouw|gastheer of gastvrouw|vast wekelijks tijdslot|vaste tijdslot|naamkoord|posters|folders|raamsticker|ronde bank|gedeelde tafel|tafel|bank|uitnodigingsbord|designated conversation table|recognisable table sign|table sign|volunteer host|fixed weekly time slot|fixed time slot|name lanyard|posters|leaflets|window sticker|circular bench|shared table|table|bench|application|interface|applicatie)/gi)||[];
  for(const term of terms)add(2,term,text);
 }
 const alias=text=>/tafelbord|table sign/i.test(text)?'sign':/gastheer|gastvrouw|volunteer host/i.test(text)?'host':/tijdslot|time slot/i.test(text)?'schedule':/naamkoord|lanyard/i.test(text)?'identity':/posters|folders|raamsticker|leaflets|window sticker/i.test(text)?'promotion':/tafel|table/i.test(text)?'table':text.toLowerCase();
 const unique=new Map();for(const item of groups[2]){const key=alias(item.text),old=unique.get(key);if(!old||item.text.length>old.text.length)unique.set(key,item);}groups[2]=[...unique.values()];
 groups[2]=groups[2].slice(0,8);groups[0]=groups[0].slice(0,8);groups[1]=groups[1].slice(0,8);
 const relations=[];
 groups[1].forEach(b=>{if(groups[0].length)relations.push({type:'realises',from:{group:1,item:b.text},to:{group:0,item:groups[0][0].text},enabled:true,quote:b.quote});});
 for(const structure of groups[2])for(const behaviour of groups[1]){
  if(behaviour.quote.toLocaleLowerCase('nl').includes(structure.text.toLocaleLowerCase('nl'))&&/maakt|helpt|ondersteunt|make|help|support|enable/i.test(behaviour.quote))relations.push({type:'enables',from:{group:2,item:structure.text},to:{group:1,item:behaviour.text},enabled:true,quote:behaviour.quote});
 }
 return {framework:'fbs',classification:'draft',collections:[{label:'Functie · waarom?',items:groups[0]},{label:'Gedrag · wat gebeurt er?',items:groups[1]},{label:'Structuur · waarmee?',items:groups[2]}],relations:relations.slice(0,40)};
}
export function validateAnalysisRelations(relations,collections){return validateRelations(relations||[],collections.map(c=>c.items.map(i=>i.text)));}
