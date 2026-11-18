import {takeTransfer} from './transfer.mjs';
import {defaults,normalize,validate,generate,distribution,models} from './engine.mjs';
const $=id=>document.getElementById(id);let current=null,baseline=null,count=0;const isSecond=document.body.dataset.exercise==='2';const key=isSecond?'breaking-prompt-ex2-system':'breaking-prompt-v2';
const list=text=>text.split('\n').map(x=>x.trim()).filter(Boolean);
function read(){return {version:3,challenge:$('challenge').value,labels:[0,1,2].map(i=>$('label'+i).value),groups:[0,1,2].map(i=>list($('g'+i).value)),selections:[0,1,2].map(readSelection),recipe:'abc',template:$('template').value,rule:{enabled:$('ruleEnabled').checked,trigger:$('ruleTrigger').value,allowed:list($('ruleAllowed').value)},lines:Number($('lines').value),seed:Number($('seed').value)};}
function readSelection(i){return {model:$('model'+i).value,center:Number($('center'+i).value)/100,spread:Number($('spread'+i).value),rate:Number($('rate'+i).value),exponent:Number($('exponent'+i).value),direction:$('direction'+i).value,weights:list($('custom'+i).value).map(x=>Number(x.replace(',','.')))};}
const descriptions={uniform:'Elke regel krijgt dezelfde kans.',normal:'Een discrete klokcurve rond de piek. Een kleinere breedte concentreert de kans.',exponential:'De kans neemt exponentieel af vanaf het gekozen uiteinde.',zipf:'De kans volgt 1 / rang^exponent. Een hogere exponent versterkt de voorkeur.',triangular:'De kans daalt lineair aan weerszijden van de piek. Buiten de driehoek is de kans 0.',custom:'Bepaal zelf de verhouding tussen de kansen van de items.'};
function update(){
 $('ruleFields').hidden=!$('ruleEnabled').checked;
 $('bItems').replaceChildren(...list($('g1').value).map(x=>{const o=document.createElement('option');o.value=x;return o;}));
 for(let i=0;i<3;i++){
  const selection=readSelection(i),model=selection.model,group=list($('g'+i).value);
  $('selectionTitle'+i).textContent=['A','B','C'][i]+' · '+$('label'+i).value;
  $('modelHelp'+i).textContent=descriptions[model];
  $('shapeFields'+i).hidden=!['normal','triangular'].includes(model);
  $('rateFields'+i).hidden=model!=='exponential';$('zipfFields'+i).hidden=model!=='zipf';
  $('directionFields'+i).hidden=!['exponential','zipf'].includes(model);$('customFields'+i).hidden=model!=='custom';
  const target=$('probabilities'+i);target.replaceChildren();
  try{const probabilities=distribution(group,selection);for(let j=0;j<group.length;j++){
   const row=document.createElement('div');row.className='probability-row';
   const label=document.createElement('span');label.className='probability-label';label.textContent=(j+1)+'. '+group[j];label.title=group[j];
   const value=document.createElement('span');value.textContent=probabilities[j]>0&&probabilities[j]<0.001?'<0,1%':(probabilities[j]*100).toLocaleString('nl-NL',{maximumFractionDigits:1})+'%';
   const track=document.createElement('div');track.className='probability-track';const bar=document.createElement('div');bar.style.width=(probabilities[j]*100)+'%';track.append(bar);row.append(label,value,track);target.append(row);
  }}catch(e){target.textContent=e.message;}
 }
}
function fill(s){s=normalize(s);s.groups.forEach((g,i)=>$('g'+i).value=g.join('\n'));s.labels.forEach((l,i)=>$('label'+i).value=l);s.selections.forEach((selection,i)=>{const d={...defaults.selections[i],...selection};for(const k of ['model','spread','rate','exponent','direction'])$(k+i).value=d[k];$('center'+i).value=d.center*100;$('custom'+i).value=d.weights.join('\n');});['challenge','template','lines','seed'].forEach(k=>$(k).value=s[k]);$('ruleEnabled').checked=s.rule.enabled;$('ruleTrigger').value=s.rule.trigger;$('ruleAllowed').value=s.rule.allowed.join('\n');update();}
function persist(){try{localStorage.setItem(key,JSON.stringify(read()));}catch{}}
function lines(target,items){$(target).replaceChildren(...items.map(t=>{const p=document.createElement('p');p.textContent=t;return p;}));}
function compare(){if(!baseline)return;$('comparison').hidden=false;lines('previous',baseline.result.lines);$('comparisonChallenge').textContent=baseline.settings.challenge;$('comparisonMeta').textContent=`${baseline.label||'Test '+baseline.number} · seed ${baseline.settings.seed}`;if(!current)return;const changed=[];current.settings.groups.forEach((g,i)=>{if(JSON.stringify(g)!==JSON.stringify(baseline.settings.groups[i]))changed.push('verzameling '+['A','B','C'][i]);});current.settings.selections.forEach((selection,i)=>{if(JSON.stringify(selection)!==JSON.stringify(baseline.settings.selections[i]))changed.push('selectie '+['A','B','C'][i]+' ('+models[selection.model]+')');});for(const [k,label] of [['challenge','ontwerpuitdaging (alleen richting)'],['labels','namen van verzamelingen'],['template','vorm van het voorstel'],['rule','verbindingsregel'],['lines','aantal voorstellen'],['seed','seed']])if(JSON.stringify(current.settings[k])!==JSON.stringify(baseline.settings[k]))changed.push(label);$('changes').textContent=changed.length?'Gewijzigd sinds de vergelijking: '+changed.join(', ')+'.':'De instellingen zijn gelijk aan de bewaarde vergelijking.';}
function run(){try{const settings=validate(read());const result=generate(settings);count++;current={settings,result,number:count};lines('output',result.lines);$('counter').textContent=`Test ${count} · seed ${settings.seed}`;$('trace').replaceChildren(...result.trace.map(t=>{const div=document.createElement('div');div.className='trace-row';div.textContent=`Voorstel ${t.row} / ${['A','B','C'][t.group]} (${settings.labels[t.group]} · ${models[t.model]}): ${t.item} · kans ${(t.probability*100).toFixed(1)}%${t.restricted?' · verbindingsregel toegepast':''}`;return div;}));$('error').textContent='';compare();persist();}catch(e){$('error').textContent=e.message;}}
$('run').onclick=run;$('baseline').onclick=()=>{if(!current){$('error').textContent='Genereer eerst voorstellen om een vergelijking te bewaren.';return;}baseline=structuredClone(current);compare();};
function changed(e){if(e?.target?.id?.startsWith('model')){const i=Number(e.target.id.slice(5));if(e.target.value==='custom'&&!$('custom'+i).value.trim())$('custom'+i).value=list($('g'+i).value).map(()=>1).join('\n');}update();persist();if(current)$('counter').textContent=`Test ${count} · nieuwe wijzigingen nog niet getest`;}
$('random').onclick=()=>{$('seed').value=crypto.getRandomValues(new Uint32Array(1))[0];changed();$('error').textContent='Nieuwe seed ingesteld. Genereer voorstellen om het effect te zien.';};
for(const el of document.querySelectorAll('.controls input,.controls textarea,.controls select,#challenge'))el.addEventListener('input',changed);
function tab(n){$('instruction').textContent=n===1?'Begin bij het bestaande systeem. Genereer voorstellen en bekijk welke ingrediënten en kansen eraan bijdragen. Kies één onverwacht voorstel en ontwikkel het op papier met je eigen verbeelding. Verander daarna één instelling en vergelijk met dezelfde seed.':'Begin bij je eigen intuïtie: schrijf een idee, observatie of verhaal, of laad een document. Bekijk woordfrequenties en samen voorkomende woorden. Laat ChatGPT daarnaast categorieën en relaties voorstellen. Beoordeel beide lezingen en maak er zelf een systeem van.';$('paperPrompt').textContent=n===1?'Wat maakte de uitkomst bij je los? Werk een voorstel op papier uit. Welke eigen betekenis, associatie of richting voegde je toe?':'Welke intuïtie werd een categorie, kans of regel? Wat zag de analyse over het hoofd, en hoe heb jij het systeem veranderd?';}
window.addEventListener('workshop:load-system',e=>{try{const system=validate(normalize(e.detail.system));const base=validate(normalize(e.detail.baselineSystem||system));const result=generate(base);fill(system);count=0;current=null;baseline={settings:structuredClone(base),result,number:0,label:'Analyse vóór jouw ingrepen'};run();$('workspace').scrollIntoView({behavior:'smooth',block:'start'});}catch(error){$('error').textContent=error.message;}});
$('reset').onclick=()=>{if(!confirm('Begin opnieuw met de campusuitdaging en voorbeeldverzamelingen? Je huidige systeem en vergelijking worden gewist.'))return;fill(structuredClone(defaults));current=null;baseline=null;count=0;$('comparison').hidden=true;$('trace').replaceChildren();$('output').replaceChildren();$('counter').textContent='Nog geen test';$('error').textContent='';tab(isSecond?2:1);persist();};
let saved;try{saved=validate(normalize(JSON.parse(localStorage.getItem(key))));}catch{}fill(saved||structuredClone(defaults));

tab(isSecond?2:1);
if(isSecond){if(!saved){try{const first=JSON.parse(localStorage.getItem('breaking-prompt-v2'));if(first?.challenge)$('challenge').value=first.challenge;}catch{}}}

if(!isSecond&&new URLSearchParams(window.location.search).get('from')==='analysis'){
 try{const transferred=takeTransfer(sessionStorage,document.documentElement.lang);if(transferred){window.dispatchEvent(new CustomEvent('workshop:load-system',{detail:transferred}));$('transferNotice').hidden=false;$('transferNotice').textContent='Systeem uit oefening 2 geladen. Je kunt nu genereren en vergelijken.';const url=new URL(window.location.href);url.searchParams.delete('from');history.replaceState(null,'',url);}}
 catch(e){$('error').textContent=e.message;}
}
