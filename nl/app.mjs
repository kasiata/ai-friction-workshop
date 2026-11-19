import {chanceSelection,presetSelection,selectionPresetName} from './weights.mjs?v=f284fc9fa3fa';
import {createRelationEditor} from './relation-editor.mjs?v=f284fc9fa3fa';
import {generationSeed} from './randomness.mjs?v=f284fc9fa3fa';
import {takeTransfer} from './transfer.mjs?v=f284fc9fa3fa';
import {workshopDefaults as defaults,fbsDefaults,normalize,validate,generate,distribution,models} from './engine.mjs?v=f284fc9fa3fa';
const $=id=>document.getElementById(id);let current=null,baseline=null,count=0;const isSecond=document.body.dataset.exercise==='2';const key=isSecond?'breaking-prompt-ex2-system':'breaking-prompt-v2';
const relationEditor=createRelationEditor($('relationRows'),{groups:()=>[0,1,2].map(i=>list($('g'+i).value)),onChange:()=>changed()});
$('addRelation').onclick=()=>relationEditor.add();
let activeFramework='custom';
const list=text=>text.split('\n').map(x=>x.trim()).filter(Boolean);
function read(){return {version:3,challenge:$('challenge').value,framework:activeFramework,relations:relationEditor.read(),relationsEnabled:$('relationsEnabled').checked,labels:[0,1,2].map(i=>$('label'+i).value),groups:[0,1,2].map(i=>list($('g'+i).value)),selections:[0,1,2].map(readSelection),recipe:'abc',template:$('template').value,rule:{enabled:$('ruleEnabled').checked,trigger:$('ruleTrigger').value,allowed:list($('ruleAllowed').value)},lines:Number($('lines').value),fixedRandomness:$('fixedRandomness').checked,seed:Number($('seed').value)};}
function readSelection(i){return {model:$('model'+i).value,center:Number($('center'+i).value)/100,spread:Number($('spread'+i).value),rate:Number($('rate'+i).value),exponent:Number($('exponent'+i).value),direction:$('direction'+i).value,weights:list($('custom'+i).value).map(x=>Number(x.replace(',','.')))};}
const descriptions={uniform:'Elke regel krijgt dezelfde kans.',normal:'Een discrete klokcurve rond de piek. Een kleinere breedte concentreert de kans.',exponential:'De kans neemt exponentieel af vanaf het gekozen uiteinde.',zipf:'De kans volgt 1 / rang^exponent. Een hogere exponent versterkt de voorkeur.',triangular:'De kans daalt lineair aan weerszijden van de piek. Buiten de driehoek is de kans 0.',custom:'Bepaal zelf de verhouding tussen de kansen van de items.'};
function update(){
 $('typedConnections').hidden=activeFramework!=='fbs';
 $('relationChanceNotice').hidden=!$('relationsEnabled').checked;$('random').disabled=!$('fixedRandomness').checked;$('ruleFields').hidden=!$('ruleEnabled').checked;
 $('bItems').replaceChildren(...list($('g1').value).map(x=>{const o=document.createElement('option');o.value=x;return o;}));
 for(let i=0;i<3;i++){
  const selection=readSelection(i),model=selection.model,group=list($('g'+i).value);
  $('selectionTitle'+i).textContent=['A','B','C'][i]+' · '+$('label'+i).value;
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
     const slider=document.createElement('input');slider.type='range';slider.id=label.htmlFor;slider.min='0';slider.max='100';slider.step='0.1';slider.setAttribute('aria-describedby','chanceHelp');slider.disabled=group.length===1;slider.setAttribute('aria-describedby','chanceHelp');
     slider.oninput=()=>{try{const next=chanceSelection(list($('g'+i).value),readSelection(i),j,Number(slider.value));writeSelection(i,next);update();persist();run();}catch(error){$('error').textContent=error.message;}};
     row.append(label,value,slider);target.append(row);
    });
   }
   [...target.children].forEach((row,j)=>{
    const percentage=probabilities[j]*100,slider=row.querySelector('input');
    row.querySelector('output').textContent=percentage>0&&percentage<0.1?'<0,1%':percentage.toLocaleString('nl-NL',{maximumFractionDigits:1})+'%';
    slider.value=Number(percentage.toFixed(1));slider.setAttribute('aria-valuetext',row.querySelector('output').textContent);
   });
  }catch(e){target.textContent=e.message;}
 }
}
function writeSelection(i,selection){for(const name of ['model','spread','rate','exponent','direction'])$(name+i).value=selection[name];$('center'+i).value=selection.center*100;$('custom'+i).value=selection.weights.join('\n');}
for(let i=0;i<3;i++)$('preset'+i).onchange=()=>{try{writeSelection(i,presetSelection($('preset'+i).value,readSelection(i)));update();persist();run();}catch(error){$('error').textContent=error.message;}};
function fill(s){s=normalize(s);activeFramework=s.framework;s.groups.forEach((g,i)=>$('g'+i).value=g.join('\n'));relationEditor.set(s.relations);$('relationsEnabled').checked=s.relationsEnabled;s.groups.forEach((g,i)=>$('g'+i).value=g.join('\n'));s.labels.forEach((l,i)=>$('label'+i).value=l);s.selections.forEach((selection,i)=>{const d={...defaults.selections[i],...selection};for(const k of ['model','spread','rate','exponent','direction'])$(k+i).value=d[k];$('center'+i).value=d.center*100;$('custom'+i).value=d.weights.join('\n');});['challenge','template','lines','seed'].forEach(k=>$(k).value=s[k]);$('fixedRandomness').checked=s.fixedRandomness!==false;$('ruleEnabled').checked=s.rule.enabled;$('ruleTrigger').value=s.rule.trigger;$('ruleAllowed').value=s.rule.allowed.join('\n');update();}
function persist(){try{localStorage.setItem(key,JSON.stringify(read()));}catch{}}
function lines(target,items,trace=[]){$(target).replaceChildren(...items.map((t,index)=>{const p=document.createElement('p');const chosen=trace.filter(draw=>draw.row===index+1);if(chosen.length){const combination=document.createElement('span');combination.className='selected-combination';chosen.forEach(draw=>{const tag=document.createElement('span');tag.textContent=['A','B','C'][draw.group]+' · '+draw.item;combination.append(tag);});p.append(combination);}const text=document.createElement('span');text.textContent=t;p.append(text);return p;}));}
function compare(){if(!baseline)return;$('comparison').hidden=false;lines('previous',baseline.result.lines,baseline.result.trace);$('comparisonChallenge').textContent=baseline.settings.challenge;$('comparisonMeta').textContent=`${baseline.label||'Test '+baseline.number}`;if(!current)return;const changed=[];current.settings.groups.forEach((g,i)=>{if(JSON.stringify(g)!==JSON.stringify(baseline.settings.groups[i]))changed.push('verzameling '+['A','B','C'][i]);});current.settings.selections.forEach((selection,i)=>{if(JSON.stringify(selection)!==JSON.stringify(baseline.settings.selections[i]))changed.push('selectie '+['A','B','C'][i]+' ('+models[selection.model]+')');});for(const [k,label] of [['challenge','ontwerpuitdaging (alleen richting)'],['labels','namen van verzamelingen'],['template','vorm van het voorstel'],['rule','verbindingsregel'],['lines','aantal voorstellen'],['seed','trekking'],['fixedRandomness','toeval vastzetten'],['relations','verbanden'],['relationsEnabled','verbanden toepassen']])if(JSON.stringify(current.settings[k])!==JSON.stringify(baseline.settings[k]))changed.push(label);$('changes').textContent=changed.length?'Gewijzigd sinds de vergelijking: '+changed.join(', ')+'.':'De instellingen zijn gelijk aan de bewaarde vergelijking.';}
function run(){try{$('seed').value=generationSeed($('seed').value,$('fixedRandomness').checked,()=>crypto.getRandomValues(new Uint32Array(1))[0]);const settings=validate(read());const result=generate(settings);count++;current={settings,result,number:count};lines('output',result.lines,result.trace);$('counter').textContent=`Test ${count}`;$('trace').replaceChildren(...result.trace.map(t=>{const div=document.createElement('div');div.className='trace-row';div.textContent=`Voorstel ${t.row} / ${['A','B','C'][t.group]} (${settings.labels[t.group]} · ${models[t.model]}): ${t.item} · kans ${(t.probability*100).toFixed(1)}%${t.restricted?' · verbindingsregel toegepast':''}${t.relations?.length?' · FBS: '+t.relations.map(r=>r.type).join(', '):''}`;return div;}));$('error').textContent='';compare();persist();}catch(e){$('error').textContent=e.message;}}
$('run').onclick=run;$('baseline').onclick=()=>{if(!current){$('error').textContent='Genereer eerst voorstellen om een vergelijking te bewaren.';return;}baseline=structuredClone(current);compare();};
function changed(e){
 const edited=e?.target?.id;
 if(edited?.match(/^g[012]$/)){
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

$('random').onclick=()=>{$('seed').value=crypto.getRandomValues(new Uint32Array(1))[0];changed();$('error').textContent='Nieuwe trekking klaar. Genereer om het effect te zien.';};
for(const el of document.querySelectorAll('.controls input,.controls textarea,.controls select,#challenge'))if(!el.id.startsWith('preset'))el.addEventListener('input',changed);
for(let i=0;i<3;i++)$('preset'+i).onchange=()=>{try{writeSelection(i,presetSelection($('preset'+i).value,readSelection(i)));update();persist();run();}catch(error){$('error').textContent=error.message;}};
function tab(n){$('instruction').textContent='';$('paperPrompt').textContent='Verander één verzameling of selectiemethode. Wat verandert er in de combinatie?';}
window.addEventListener('workshop:load-system',e=>{try{const system=validate(normalize(e.detail.system));const base=validate(normalize(e.detail.baselineSystem||system));const result=generate(base);fill(system);count=0;current=null;baseline={settings:structuredClone(base),result,number:0,label:'Analyse vóór jouw ingrepen'};run();$('workspace').scrollIntoView({behavior:'smooth',block:'start'});}catch(error){$('error').textContent=error.message;}});
$('reset').onclick=()=>{if(!confirm('Begin opnieuw met de campusuitdaging en voorbeeldverzamelingen? Je huidige systeem en vergelijking worden gewist.'))return;fill(structuredClone(defaults));current=null;baseline=null;count=0;$('comparison').hidden=true;$('trace').replaceChildren();$('output').replaceChildren();$('counter').textContent='Nog geen test';$('error').textContent='';tab(isSecond?2:1);persist();};
let saved;try{const raw=localStorage.getItem(key);if(raw)saved=validate(normalize(JSON.parse(raw)));}catch{}
let upgradedExample=false,restoredChallenge=null;
const obsoleteFragments=saved&&/^(Vertrekpunt:|Starting point:)/.test(saved.template)&&/(Bronfragment:|Source fragment:|Verband om te verkennen:|Connection to explore:)/.test(saved.template);
const imposedExample=saved&&saved.framework==='fbs'&&JSON.stringify(saved.groups)===JSON.stringify(fbsDefaults.groups)&&saved.template===fbsDefaults.template;
const oldFbsExample=saved&&saved.framework==='fbs'&&saved.template==='Doel: {A}. Verwacht gedrag: {B}. Verken als structuur: {C}.'&&JSON.stringify(saved.groups[2])===JSON.stringify(['herkenbaar tafelbord','gedeelde gesprekstafel','vaste gastheer of gastvrouw','wekelijks tijdslot','stille individuele zitplek']);
if(obsoleteFragments||imposedExample||oldFbsExample){try{localStorage.setItem(key+'-before-collections-restore',JSON.stringify(saved));restoredChallenge=saved.challenge;saved=null;upgradedExample=true;}catch{}}
fill(saved||{...structuredClone(defaults),...(restoredChallenge?{challenge:restoredChallenge}:{})});

tab(isSecond?2:1);
if(isSecond){if(!saved){try{const first=JSON.parse(localStorage.getItem('breaking-prompt-v2'));if(first?.challenge)$('challenge').value=first.challenge;}catch{}}}

if(!isSecond&&new URLSearchParams(window.location.search).get('from')==='analysis'){
 try{const transferred=takeTransfer(sessionStorage,document.documentElement.lang);if(transferred){window.dispatchEvent(new CustomEvent('workshop:load-system',{detail:transferred}));$('transferNotice').hidden=false;$('transferNotice').textContent='Systeem uit oefening 2 geladen. Je kunt nu genereren en vergelijken.';const url=new URL(window.location.href);url.searchParams.delete('from');history.replaceState(null,'',url);}}
 catch(e){$('error').textContent=e.message;}
}

if(!current)run();
if(upgradedExample){$('transferNotice').hidden=false;$('transferNotice').textContent='Terug naar verzamelingen en selectie. De vorige versie van je systeem is als download bewaard.';const download=document.createElement('a');download.textContent='Download vorig systeem';download.href=URL.createObjectURL(new Blob([localStorage.getItem(key+'-before-collections-restore')],{type:'application/json'}));download.download='previous-workshop-system.json';$('transferNotice').append(' ',download);}
