import {validateRelations,relationCandidates} from './relations.mjs?v=f284fc9fa3fa';
import {fbsGroups,fbsRelations,fbsLabels,fbsTemplate} from './fbs-data.mjs?v=f284fc9fa3fa';
export const selectionDefaults={model:'uniform',center:0.5,spread:0.2,rate:2,exponent:1.2,direction:'start',weights:[]};
export const models={uniform:"Uniform",normal:"Normal",exponential:"Exponential",zipf:'Zipf',triangular:"Triangular",custom:"Custom weights"};
export const defaults={version:3,framework:'custom',relations:[],relationsEnabled:false,challenge:"Design a place on campus where strangers feel comfortable starting a conversation.",labels:["Spatial elements","Activities","Qualities"],groups:[["a circular bench","a movable wall","a shared table","a sheltered nook","an open stage"],["share a personal story","build something together","share food","exchange a question","draw together"],["playful","quiet","surprising","welcoming","energetic"]],selections:Array.from({length:3},()=>structuredClone(selectionDefaults)),recipe:'abc',template:"A place with {A}, where people {B}. The atmosphere is {C}.",rule:{enabled:false,trigger:"share a personal story",allowed:["quiet","welcoming"]},lines:4,seed:42};
export const workshopDefaults={...structuredClone(defaults),template:"Arrange the place with {A}. Invite visitors to {B}. Make it feel {C}, with a visible welcome and room to join in. This creates a concrete proposal to try out on campus."};
export const fbsDefaults={...structuredClone(defaults),framework:'fbs',groups:structuredClone(fbsGroups),labels:[...fbsLabels],template:fbsTemplate,relations:structuredClone(fbsRelations),relationsEnabled:false,rule:{enabled:false,trigger:fbsGroups[1][0],allowed:fbsGroups[2].slice(1,3)}};
export function normalize(s){
 if(!s) return structuredClone(defaults);
 const {mode,weights,...rest}=s;
 const selections=s.selections||s.groups?.map((g,i)=>({...structuredClone(selectionDefaults),...(mode==='first'||mode==='rising'?{model:'custom',weights:g.map((_,j)=>mode==='first'?(j===0?weights?.[i]||1:1):j+1)}:{})}));
 return {...structuredClone(defaults),...rest,version:3,selections,framework:s.framework||'custom',relations:s.relations||[],relationsEnabled:s.relationsEnabled===true,labels:s.labels||["Collection A","Collection B","Collection C"],template:s.template||'{A} {B} {C}',rule:s.rule||{enabled:false,trigger:'',allowed:[]}};
}
export function distribution(group,selection){
 if(!group.length)throw Error("Add at least one item.");
 if(!selection||!Object.hasOwn(models,selection.model))throw Error("Choose a valid selection model.");
 const {model,center,spread,rate,exponent,direction}=selection;
 if(['normal','triangular'].includes(model)&&(!Number.isFinite(center)||center<0||center>1||!Number.isFinite(spread)||spread<0.05||spread>1))throw Error("Use a peak between 0 and 100% and a width between 0.05 and 1.");
 if(model==='exponential'&&(!Number.isFinite(rate)||rate<0.1||rate>8))throw Error("Use a decay between 0.1 and 8.");
 if(model==='zipf'&&(!Number.isFinite(exponent)||exponent<0||exponent>3))throw Error("Use an exponent between 0 and 3.");
 if(['exponential','zipf'].includes(model)&&!['start','end'].includes(direction))throw Error("Choose start or end as the direction.");
 if(model==='custom'&&(!Array.isArray(selection.weights)||selection.weights.length!==group.length||selection.weights.some(w=>!Number.isFinite(w)||w<0||w>1000000)))throw Error("Give each item one weight (0 to 1000000), in the same order.");
 const n=group.length;
 const raw=group.map((_,i)=>{const x=n===1?center:i/(n-1),rank=direction==='end'?n-i:i+1;
  switch(model){case 'uniform':return 1;case 'normal':return Math.exp(Math.max(-700,-0.5*((x-center)/spread)**2));case 'exponential':return Math.exp(-rate*(direction==='end'?1-x:x));case 'zipf':return rank**(-exponent);case 'triangular':return n===1?1:Math.max(0,1-Math.abs(i-center*(n-1))/Math.max(1,spread*(n-1)));case 'custom':return selection.weights[i];}
 });
 const total=raw.reduce((a,b)=>a+b,0);
  if(!total)throw Error("At least one item must have a positive weight.");return raw.map(w=>w/total);
}
export function validate(s){
 if(!s||!Array.isArray(s.groups)||s.groups.length!==3||s.groups.some(g=>!Array.isArray(g)||g.length>300||g.some(x=>typeof x!=='string'||!x.trim()||x.length>500)))throw Error("Use three collections with no more than 300 non-empty items each.");
 if(s.groups.some(g=>!g.length))throw Error("Fill each collection with at least one item.");
 if(!['abc','cba','echo'].includes(s.recipe)||!Number.isInteger(s.lines)||s.lines<1||s.lines>12||!Number.isInteger(s.seed)||s.seed<0||s.seed>4294967295)throw Error("Check the recipe, number of proposals and seed.");
 if(!Array.isArray(s.selections)||s.selections.length!==3)throw Error("Choose a selection model for each collection.");
 s.groups.forEach((g,i)=>{try{distribution(g,s.selections[i]);}catch(e){throw Error("Collection "+['A','B','C'][i]+': '+e.message);}});
 if(typeof s.challenge!=='string'||!s.challenge.trim()||s.challenge.length>2000||!Array.isArray(s.labels)||s.labels.length!==3||s.labels.some(x=>typeof x!=='string'||!x.trim()||x.length>100))throw Error("Enter a design challenge and three collection names.");
 if(typeof s.template!=='string'||s.template.length>2000||!['{A}','{B}','{C}'].every(t=>s.template.includes(t)))throw Error("Use {A}, {B} and {C} in your proposal template.");
 if(!s.rule||typeof s.rule.enabled!=='boolean'||typeof s.rule.trigger!=='string'||!Array.isArray(s.rule.allowed)||s.rule.allowed.some(x=>typeof x!=='string'))throw Error("Invalid connection rule.");
 if(s.rule.enabled){if(!s.groups[1].includes(s.rule.trigger))throw Error("The condition must exactly match an item in B.");if(!s.rule.allowed.length||s.rule.allowed.some(x=>!s.groups[2].includes(x)))throw Error("Choose at least one existing C item for the connection rule. Use its exact text.");}
 if(s.relationsEnabled!==undefined&&typeof s.relationsEnabled!=='boolean')throw Error("Choose whether FBS relations are enabled.");
 validateRelations(s.relations||[],s.groups,{references:s.relationsEnabled===true});
 return s;
}
export function generate(s){
 validate(s);let t=Number(s.seed)>>>0;
 const random=()=>{t=(t+0x6D2B79F5)>>>0;let n=t;n=Math.imul(n^n>>>15,n|1);n^=n+Math.imul(n^n>>>7,n|61);return ((n^n>>>14)>>>0)/4294967296;};
 const trace=[],lines=[];
 const probabilities=s.groups.map((g,i)=>distribution(g,s.selections[i]));
 function pick(group,i,row,restricted=false,selected=[]){
  const fbs=relationCandidates(s,i,selected);
  const choices=group.map((item,index)=>({item,index,weight:probabilities[i][index]})).filter(x=>(!restricted||s.rule.allowed.includes(x.item))&&(!fbs?.allowed||fbs.allowed.has(x.item))&&!fbs?.excluded.has(x.item));
  const total=choices.reduce((sum,x)=>sum+x.weight,0);
  if(!total&&fbs?.used.length)throw Error("The active FBS relations leave no selectable ingredient. Edit the relations or probabilities.");
  if(!total)throw Error("The connection rule leaves only C items with probability 0. Adjust the rule or C selection model.");
  let r=random()*total,choice=choices.findLast(x=>x.weight>0);
  for(const x of choices){r-=x.weight;if(r<0){choice=x;break;}}
  trace.push({row,group:i,index:choice.index,item:choice.item,probability:choice.weight/total,restricted,relations:(fbs?.used||[]).map(r=>({type:r.type,from:r.from.item,to:r.to.item})),model:s.selections[i].model});return choice.item;
 }
 let previous='';for(let row=1;row<=s.lines;row++){const a=pick(s.groups[0],0,row),b=pick(s.groups[1],1,row,false,[a]),restricted=s.rule.enabled&&b===s.rule.trigger,c=pick(s.groups[2],2,row,restricted,[a,b]);const values={A:s.recipe==='echo'&&row>1?previous:a,B:b,C:c};const template=s.recipe==='cba'?'{C} {B} {A}':s.template;lines.push(template.replace(/\{([ABC])\}/g,(_,key)=>values[key]));previous=c;}
 return {lines,trace};
}
