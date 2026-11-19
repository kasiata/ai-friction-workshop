import {createUnexpectedEditor} from './unexpected-editor.mjs?v=2bee8638922a';
import {chanceSelection,presetSelection,selectionPresetName} from './weights.mjs?v=2bee8638922a';
import {createRelationEditor} from './relation-editor.mjs?v=2bee8638922a';
import {generationSeed} from './randomness.mjs?v=2bee8638922a';
import {takeTransfer} from './transfer.mjs?v=2bee8638922a';
import {workshopDefaults as defaults,previousWorkshopTemplate,threeCollectionTemplate,withInterventions,defaults as legacyDefaults,fbsDefaults,normalize,validate,generate,distribution,models} from './engine.mjs?v=2bee8638922a';
const $=id=>document.getElementById(id);let current=null,baseline=null,count=0;const isSecond=document.body.dataset.exercise==='2';const key=isSecond?'breaking-prompt-ex2-system-en':'breaking-prompt-v2-en';
const unexpectedEditor=createUnexpectedEditor($('unexpectedCollection'),$('unexpectedSelection'),{onChange:()=>{if(current)run();}});
const relationEditor=createRelationEditor($('relationRows'),{groups:()=>[0,1,2].map(i=>list($('g'+i).value)),onChange:()=>changed()});
$('addRelation').onclick=()=>relationEditor.add();
let activeFramework='custom',activeGroupCount=4;
const groupIndices=()=>Array.from({length:activeGroupCount},(_,i)=>i);
const list=text=>text.split('\n').map(x=>x.trim()).filter(Boolean);
function read(){return {version:3,unexpected:unexpectedEditor.read(),challenge:$('challenge').value,framework:activeFramework,relations:relationEditor.read(),relationsEnabled:$('relationsEnabled').checked,labels:groupIndices().map(i=>$('label'+i).value),groups:groupIndices().map(i=>list($('g'+i).value)),selections:groupIndices().map(readSelection),recipe:'abc',template:$('template').value,rule:{enabled:$('ruleEnabled').checked,trigger:$('ruleTrigger').value,allowed:list($('ruleAllowed').value)},lines:Number($('lines').value),fixedRandomness:$('fixedRandomness').checked,seed:Number($('seed').value)};}
function readSelection(i){return {model:$('model'+i).value,center:Number($('center'+i).value)/100,spread:Number($('spread'+i).value),rate:Number($('rate'+i).value),exponent:Number($('exponent'+i).value),direction:$('direction'+i).value,weights:list($('custom'+i).value).map(x=>Number(x.replace(',','.')))};}
const descriptions={uniform:"Each line has the same probability.",normal:"A discrete bell curve around the peak. A smaller width concentrates the probability.",exponential:"Probability decays exponentially from the selected end.",zipf:"Probability follows 1 / rank^exponent. A larger exponent strengthens the preference.",triangular:"Probability decreases linearly on either side of the peak. Outside the triangle it is 0.",custom:"Set the relative probabilities of the items yourself."};
function update(){
 $('typedConnections').hidden=activeFramework!=='fbs';
 $('relationChanceNotice').hidden=!$('relationsEnabled').checked;$('random').disabled=!$('fixedRandomness').checked;$('ruleFields').hidden=!$('ruleEnabled').checked;
 $('bItems').replaceChildren(...list($('g1').value).map(x=>{const o=document.createElement('option');o.value=x;return o;}));
 for(let i=0;i<activeGroupCount;i++){
  const selection=readSelection(i),model=selection.model,group=list($('g'+i).value);
  $('selectionTitle'+i).textContent=['A','B','C','D'][i]+' · '+$('label'+i).value;
  $('modelHelp'+i).textContent=descriptions[model];$('preset'+i).value=selectionPresetName(selection);
  $('shapeFields'+i).hidden=!['normal','triangular'].includes(model);
  $('rateFields'+i).hidden=model!=='exponential';$('zipfFields'+i).hidden=model!=='zipf';
  $('directionFields'+i).hidden=!['exponential','zipf'].includes(model);$('customFields'+i).hidden=model!=='custom';
  $('modelSettings'+i).hidden=model==='uniform';const target=$('probabilities'+i);const spark=$('spark'+i);spark.replaceChildren();
  try{const probabilities=distribution(group,selection);const ns='http://www.w3.org/2000/svg';const chart=document.createElementNS(ns,'svg');chart.setAttribute('viewBox',`0 0 ${Math.max(group.length,1)*12} 52`);chart.setAttribute('preserveAspectRatio','none');chart.setAttribute('aria-hidden','true');const max=Math.max(...probabilities);probabilities.forEach((p,j)=>{const bar=document.createElementNS(ns,'rect');bar.setAttribute('x',j*12+1);bar.setAttribute('y',52-p/max*46);bar.setAttribute('width',9);bar.setAttribute('height',p/max*46);chart.append(bar);});spark.append(chart);const existing=[...target.children];
   if(existing.length!==group.length||existing.some((row,j)=>row.dataset.item!==group[j])){
    target.replaceChildren();
    group.forEach((item,j)=>{
     const row=document.createElement('div');row.className='probability-row chance-row';row.dataset.item=item;
     const label=document.createElement('label');label.className='probability-label';label.htmlFor='chance-'+i+'-'+j;label.textContent=item;
     const value=document.createElement('output');value.htmlFor=label.htmlFor;
     const slider=document.createElement('input');slider.type='range';slider.id=label.htmlFor;slider.min='0';slider.max='100';slider.step='0.1';slider.setAttribute('aria-describedby','chanceHelp');slider.disabled=group.length===1;
     slider.oninput=()=>{try{const next=chanceSelection(list($('g'+i).value),readSelection(i),j,Number(slider.value));writeSelection(i,next);update();persist();run();}catch(error){$('error').textContent=error.message;}};
     row.append(label,value,slider);target.append(row);
    });
   }
   [...target.children].forEach((row,j)=>{
    const percentage=probabilities[j]*100,slider=row.querySelector('input');
    row.querySelector('output').textContent=percentage>0&&percentage<0.1?"<0.1%":percentage.toLocaleString('en-GB',{maximumFractionDigits:1})+'%';
    slider.value=Number(percentage.toFixed(1));slider.setAttribute('aria-valuetext',row.querySelector('output').textContent);
   });
  }catch(e){target.textContent=e.message;}
 }
}
function writeSelection(i,selection){for(const name of ['model','spread','rate','exponent','direction'])$(name+i).value=selection[name];$('center'+i).value=selection.center*100;$('custom'+i).value=selection.weights.join('\n');}
for(let i=0;i<4;i++)$('preset'+i).onchange=()=>{try{writeSelection(i,presetSelection($('preset'+i).value,readSelection(i)));update();persist();run();}catch(error){$('error').textContent=error.message;}};
function fill(s){s=normalize(s);activeGroupCount=s.groups.length;$('collectionColumn3').hidden=activeGroupCount<4;$('selectionCard3').hidden=activeGroupCount<4;$('addInterventionCollection').hidden=activeGroupCount===4;unexpectedEditor.set(s.unexpected);activeFramework=s.framework;s.groups.forEach((g,i)=>$('g'+i).value=g.join('\n'));relationEditor.set(s.relations);$('relationsEnabled').checked=s.relationsEnabled;s.groups.forEach((g,i)=>$('g'+i).value=g.join('\n'));s.labels.forEach((l,i)=>$('label'+i).value=l);s.selections.forEach((selection,i)=>{const d={...defaults.selections[i],...selection};for(const k of ['model','spread','rate','exponent','direction'])$(k+i).value=d[k];$('center'+i).value=d.center*100;$('custom'+i).value=d.weights.join('\n');});['challenge','template','lines','seed'].forEach(k=>$(k).value=s[k]);$('fixedRandomness').checked=s.fixedRandomness!==false;$('ruleEnabled').checked=s.rule.enabled;$('ruleTrigger').value=s.rule.trigger;$('ruleAllowed').value=s.rule.allowed.join('\n');update();}
function persist(){try{localStorage.setItem(key,JSON.stringify(read()));}catch{}}
function lines(target,items,trace=[]){$(target).replaceChildren(...items.map((t,index)=>{const p=document.createElement('p');const chosen=trace.filter(draw=>draw.row===index+1);if(chosen.length){const combination=document.createElement('span');combination.className='selected-combination';chosen.forEach(draw=>{const tag=document.createElement('span');tag.textContent=['A','B','C','D'][draw.group]+' · '+draw.item;combination.append(tag);});p.append(combination);}const text=document.createElement('span');text.textContent=t;p.append(text);return p;}));}
function compare(){if(!baseline)return;$('comparison').hidden=false;lines('previous',baseline.result.lines,baseline.result.trace);$('comparisonChallenge').textContent=baseline.settings.challenge;$('comparisonMeta').textContent=`${baseline.label||'Test '+baseline.number}`;if(!current)return;const changed=[];current.settings.groups.forEach((g,i)=>{if(JSON.stringify(g)!==JSON.stringify(baseline.settings.groups[i]))changed.push("collection "+['A','B','C','D'][i]);});current.settings.selections.forEach((selection,i)=>{if(JSON.stringify(selection)!==JSON.stringify(baseline.settings.selections[i]))changed.push("selection "+['A','B','C','D'][i]+' ('+models[selection.model]+')');});for(const [k,label] of [['challenge',"design challenge (direction only)"],['labels',"collection names"],['template',"proposal template"],['unexpected',"unexpected element"],['rule',"connection rule"],['lines',"number of proposals"],['seed',"draw"],['fixedRandomness',"fixed randomness"],['relations',"relationships"],['relationsEnabled',"apply relationships"]])if(JSON.stringify(current.settings[k])!==JSON.stringify(baseline.settings[k]))changed.push(label);$('changes').textContent=changed.length?"Changed since the comparison: "+changed.join(', ')+'.':"The settings match the saved comparison.";}
function run(){try{$('seed').value=generationSeed($('seed').value,$('fixedRandomness').checked,()=>crypto.getRandomValues(new Uint32Array(1))[0]);const settings=validate(read());const result=generate(settings);count++;current={settings,result,number:count};lines('output',result.lines,result.trace);$('counter').textContent=`Test ${count}`;$('trace').replaceChildren(...result.trace.map(t=>{const div=document.createElement('div');div.className='trace-row';div.textContent=`Proposal ${t.row} / ${['A','B','C','D'][t.group]} (${settings.labels[t.group]} · ${models[t.model]}): ${t.item} · chance ${(t.probability*100).toFixed(1)}%${t.restricted?' · connection rule applied':''}${t.relations?.length?' · FBS: '+t.relations.map(r=>r.type).join(', '):''}`;return div;}));$('error').textContent='';compare();persist();}catch(e){$('error').textContent=e.message;}}
$('addInterventionCollection').onclick=()=>{try{fill(withInterventions(read()));run();}catch(error){$('error').textContent=error.message;}};
$('run').onclick=run;$('baseline').onclick=()=>{if(!current){$('error').textContent="Generate proposals first to save a comparison.";return;}baseline=structuredClone(current);compare();};
function changed(e){
 const edited=e?.target?.id;
 if(edited?.match(/^g[0123]$/)){
  const i=Number(edited.slice(1));
  if($('model'+i).value==='custom'){
   const previous=[...$('probabilities'+i).children].map(row=>row.dataset.item),weights=readSelection(i).weights,group=list($('g'+i).value);
   const average=weights.reduce((sum,w)=>sum+w,0)/(weights.length||1)||1;
   let next=group.map((item,j)=>{const old=previous.indexOf(item);return old>=0?weights[old]??average:average;});
   if(next.length&&!next.some(w=>w>0))next=next.map(()=>1);
   $('custom'+i).value=next.join('\n');
  }
  relationEditor.refresh();
 }
 if(edited?.startsWith('model')){
  const i=Number(edited.slice(5));
  if(e.target.value==='custom'&&!$('custom'+i).value.trim())$('custom'+i).value=list($('g'+i).value).map(()=>1).join('\n');
 }
 update();persist();if(current)run();
}

$('random').onclick=()=>{$('seed').value=crypto.getRandomValues(new Uint32Array(1))[0];changed();$('error').textContent="New draw ready. Generate to see its effect.";};
for(const el of document.querySelectorAll('.controls input,.controls textarea,.controls select,#challenge'))if(!el.id.startsWith('preset')&&!el.closest('.unexpected-editor'))el.addEventListener('input',changed);
for(let i=0;i<4;i++)$('preset'+i).onchange=()=>{try{writeSelection(i,presetSelection($('preset'+i).value,readSelection(i)));update();persist();run();}catch(error){$('error').textContent=error.message;}};
function tab(n){$('instruction').textContent='';$('paperPrompt').textContent="Change one collection or selection method. What changes in the combination?";}
window.addEventListener('workshop:load-system',e=>{try{const system=validate(normalize(e.detail.system));const base=validate(normalize(e.detail.baselineSystem||system));const result=generate(base);fill(system);count=0;current=null;baseline={settings:structuredClone(base),result,number:0,label:"Analysis before your changes"};run();$('workspace').scrollIntoView({behavior:'smooth',block:'start'});}catch(error){$('error').textContent=error.message;}});
$('reset').onclick=()=>{if(!confirm("Start again with the campus challenge and example collections? Your current system and comparison will be cleared."))return;fill(structuredClone(defaults));current=null;baseline=null;count=0;$('comparison').hidden=true;$('trace').replaceChildren();$('output').replaceChildren();$('counter').textContent="No test yet";$('error').textContent='';tab(isSecond?2:1);persist();};
let saved;try{const raw=localStorage.getItem(key);if(raw)saved=validate(normalize(JSON.parse(raw)));}catch{}
if(saved?.template===previousWorkshopTemplate)saved.template=defaults.template;
if(saved?.framework==='custom'&&saved.groups.length===3&&JSON.stringify(saved.groups)===JSON.stringify(legacyDefaults.groups)&&[legacyDefaults.template,threeCollectionTemplate].includes(saved.template))saved=withInterventions(saved);
let upgradedExample=false,restoredChallenge=null;
const obsoleteFragments=saved&&/^(Vertrekpunt:|Starting point:)/.test(saved.template)&&/(Bronfragment:|Source fragment:|Verband om te verkennen:|Connection to explore:)/.test(saved.template);
const imposedExample=saved&&saved.framework==='fbs'&&JSON.stringify(saved.groups)===JSON.stringify(fbsDefaults.groups)&&saved.template===fbsDefaults.template;
const oldFbsExample=saved&&saved.framework==='fbs'&&saved.template==="Goal: {A}. Expected behaviour: {B}. Explore as structure: {C}."&&JSON.stringify(saved.groups[2])===JSON.stringify(["recognisable table sign","shared conversation table","regular host","weekly time slot","quiet individual seat"]);
if(obsoleteFragments||imposedExample||oldFbsExample){try{localStorage.setItem(key+'-before-collections-restore',JSON.stringify(saved));restoredChallenge=saved.challenge;saved=null;upgradedExample=true;}catch{}}
fill(saved||{...structuredClone(defaults),...(restoredChallenge?{challenge:restoredChallenge}:{})});

tab(isSecond?2:1);
if(isSecond){if(!saved){try{const first=JSON.parse(localStorage.getItem('breaking-prompt-v2-en'));if(first?.challenge)$('challenge').value=first.challenge;}catch{}}}

if(!isSecond&&new URLSearchParams(window.location.search).get('from')==='analysis'){
 try{const transferred=takeTransfer(sessionStorage,document.documentElement.lang);if(transferred){window.dispatchEvent(new CustomEvent('workshop:load-system',{detail:transferred}));$('transferNotice').hidden=false;$('transferNotice').textContent="System from Exercise 2 loaded. You can now generate and compare.";const url=new URL(window.location.href);url.searchParams.delete('from');history.replaceState(null,'',url);}}
 catch(e){$('error').textContent=e.message;}
}

if(!current)run();
if(upgradedExample){$('transferNotice').hidden=false;$('transferNotice').textContent="Back to collections and selection. The previous version of your system is available as a download.";const download=document.createElement('a');download.textContent="Download previous system";download.href=URL.createObjectURL(new Blob([localStorage.getItem(key+'-before-collections-restore')],{type:'application/json'}));download.download='previous-workshop-system.json';$('transferNotice').append(' ',download);}
