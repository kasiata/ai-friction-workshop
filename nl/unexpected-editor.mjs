import {associateThree,associationStarts} from './associations.mjs?v=86cc2ddaa7c5';
import {unexpectedDefaults,distribution} from './engine.mjs?v=86cc2ddaa7c5';
import {chanceSelection,presetSelection,selectionPresetName} from './weights.mjs?v=86cc2ddaa7c5';
export function createUnexpectedEditor(collectionRoot,selectionRoot,{onChange=()=>{},getGroups=()=>[]}={}){
 const doc=collectionRoot.ownerDocument,el=(tag,text)=>{const n=doc.createElement(tag);if(text!==undefined)n.textContent=text;return n;};let selection=structuredClone(unexpectedDefaults.selection),association=null,sourceEdited=false;
 const wild=el('section'),wildTitle=el('h3','Randomness · 3 associaties'),sourceLabel=el('label','Startwoord'),source=el('input'),choices=el('datalist'),button=el('button','Randomness ↝'),clear=el('button','Wis associatie'),chain=el('p'),status=el('p');wild.className='association-panel';source.id='associationSource';source.maxLength=500;sourceLabel.htmlFor=source.id;source.setAttribute('list','associationWords');choices.id='associationWords';button.id='associationRandom';button.type='button';button.className='primary';clear.type='button';clear.className='quiet';chain.id='associationChain';chain.className='association-chain';status.className='hint';const actions=el('div');actions.className='association-actions';actions.append(button,clear);wild.append(wildTitle,sourceLabel,source,choices,actions,chain,status);collectionRoot.append(wild);
 source.oninput=()=>sourceEdited=true;
 function refresh(){const words=[...new Set([...getGroups().flat(),...associationStarts()])];choices.replaceChildren(...words.map(word=>{const option=el('option');option.value=word;return option;}));if(!sourceEdited&&!association?.enabled)source.value=getGroups().flat()[0]||words[0]||'';}
 function showAssociation(){clear.hidden=!association?.enabled;chain.textContent=association?.enabled?association.chain.join(' → '):'';}
 button.onclick=()=>{try{association=associateThree(source.value,()=>crypto.getRandomValues(new Uint32Array(1))[0]/4294967296,association);toggle.checked=false;status.textContent='Het laatste element krijgt een concrete rol in het voorstel.';showAssociation();update();onChange();}catch(error){status.textContent=error.message;}};clear.onclick=()=>{association=null;status.textContent='';showAssociation();onChange();};
 const label=el('label'),toggle=el('input');label.className='check';toggle.type='checkbox';toggle.id='unexpectedEnabled';label.append(toggle,doc.createTextNode('Eigen onverwachte elementen (optioneel)'));
 const fields=el('div'),help=el('p','Een extra verzameling met verrassingen of beperkingen. Eén element wordt aan elk voorstel toegevoegd.');help.className='hint';const itemLabel=el('label','Onverwachte elementen · één per regel'),items=el('textarea');items.id='unexpectedItems';items.rows=5;itemLabel.htmlFor=items.id;fields.append(help,itemLabel,items);collectionRoot.append(label,fields);
 const heading=el('h3','★ Onverwacht element'),methodLabel=el('label','Selectiemethode'),method=el('select');method.id='unexpectedPreset';methodLabel.htmlFor=method.id;
 for(const [value,text] of [['equal','Iedereen evenveel kans'],['first','Eerste items vaker'],['last','Laatste items vaker'],['middle','Midden vaker · klokcurve'],['peak','Gerichte piek · driehoek'],['tail-first','Eerste favoriet · lange staart'],['tail-last','Laatste favoriet · lange staart'],['custom','Eigen verdeling']]){const option=el('option',text);option.value=value;option.disabled=value==='custom';method.append(option);}
 const sliders=el('div');sliders.className='chance-sliders';selectionRoot.append(heading,methodLabel,method,sliders);
 const list=()=>items.value.split('\n').map(text=>text.trim()).filter(Boolean);
 function update(){
  fields.hidden=!toggle.checked;selectionRoot.hidden=!toggle.checked;method.value=selectionPresetName(selection);
  if(!toggle.checked)return;
  const group=list();let probabilities;try{probabilities=distribution(group,selection);}catch{sliders.replaceChildren();return;}
  const rows=[...sliders.children];if(rows.length!==group.length||rows.some((row,i)=>row.dataset.item!==group[i])){
   sliders.replaceChildren();group.forEach((text,i)=>{const row=el('div'),name=el('label',text),value=el('output'),slider=el('input');row.className='chance-row';row.dataset.item=text;slider.type='range';slider.min='0';slider.max='100';slider.step='0.1';slider.disabled=group.length===1;slider.id='unexpectedChance'+i;name.htmlFor=slider.id;
    slider.oninput=()=>{selection=chanceSelection(list(),selection,i,Number(slider.value));update();onChange();};row.append(name,value,slider);sliders.append(row);
   });
  }
  [...sliders.children].forEach((row,i)=>{const percent=probabilities[i]*100;row.querySelector('output').textContent=percent.toLocaleString('nl-NL',{maximumFractionDigits:1})+'%';row.querySelector('input').value=Number(percent.toFixed(1));});
 }
 toggle.oninput=()=>{update();onChange();};
 method.onchange=()=>{selection=presetSelection(method.value,selection);update();onChange();};
 items.oninput=()=>{const group=list(),previous=[...sliders.children].map(row=>row.dataset.item);if(selection.model==='custom'){selection={...selection,weights:group.map(text=>{const index=previous.indexOf(text);return index>=0?selection.weights[index]:1;})};if(selection.weights.length&&!selection.weights.some(w=>w>0))selection.weights=selection.weights.map(()=>1);}update();onChange();};
 for(const root of [collectionRoot,selectionRoot])root.addEventListener('input',event=>event.stopPropagation());
 function set(value){const next=value||unexpectedDefaults;toggle.checked=next.enabled;items.value=next.items.join('\n');selection=structuredClone(next.selection);association=next.association||null;if(association?.source)source.value=association.source;showAssociation();refresh();update();}
 set();return {read:()=>({enabled:toggle.checked,items:list(),selection:structuredClone(selection),...(association?{association:structuredClone(association)}:{})}),set,refresh};
}
