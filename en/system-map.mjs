import {ingredientWeights} from './weights.mjs?v=69db5fde08ff';
import {relationLabel} from './relations.mjs?v=69db5fde08ff';
import {distribution,generate} from './engine.mjs?v=69db5fde08ff';
export function mapData(system){return {collections:system.groups.map((group,i)=>({label:system.labels[i],items:group.map((text,index)=>({text,index,probability:distribution(group,system.selections[i])[index]}))})),rule:structuredClone(system.rule),relations:structuredClone(system.relations||[]),relationsEnabled:system.relationsEnabled===true,outputs:generate(system).lines.slice(0,2)};}
export function renderSystemMap(root,system,{sourceLength=0,onSelect=()=>{},onEdit=()=>{},onWeight=()=>{}}={}){
 const data=mapData(system),weightNodes=[[],[],[]],doc=root.ownerDocument;const el=(tag,cls,text)=>{const node=doc.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;};
 root.replaceChildren();const source=el('div','map-source');source.append(el('strong','',"Source text"),el('span','hint',sourceLength.toLocaleString('en-GB')+" characters"));root.append(source,el('div','map-branches'));
 const groups=el('div','map-collections');
 data.collections.forEach((c,i)=>{const section=el('section','map-collection'),heading=el('div','map-collection-heading');heading.append(el('span','map-letter',['A','B','C'][i]),el('h3','',c.label));section.append(heading);
  const weights=ingredientWeights(system,i),maximum=Math.max(10,...weights.map(w=>Math.ceil(w)));
  const addItem=item=>{const row=el('div','map-ingredient-row'),button=el('button','map-ingredient');button.type='button';button.setAttribute('aria-pressed','false');button.setAttribute('aria-label',item.text);button.title=item.text;const label=el('span','map-ingredient-text',item.text.length>72?item.text.slice(0,69)+'…':item.text),value=el('span','map-probability'),track=el('span','map-probability-track'),bar=el('span');track.append(bar);button.append(label,value,track);button.onclick=()=>{for(const n of root.querySelectorAll('.map-ingredient'))n.setAttribute('aria-pressed','false');button.setAttribute('aria-pressed','true');onSelect(i,item.index);};
   const slider=el('input','map-weight-slider');slider.type='range';slider.min='0';slider.max=String(maximum);slider.step=maximum<=100?'0.1':'1';slider.value=String(weights[item.index]);slider.setAttribute('aria-label',"Adjust weight: "+item.text);slider.oninput=()=>onWeight(i,item.index,Number(slider.value));row.append(button,slider);weightNodes[i][item.index]={value,bar,slider};return row;};
  c.items.slice(0,6).forEach(item=>section.append(addItem(item)));if(c.items.length>6){const more=el('details','map-more');more.append(el('summary','',String(c.items.length-6)+" more"));c.items.slice(6).forEach(item=>more.append(addItem(item)));section.append(more);}groups.append(section);
 });root.append(groups);
 const chance=el('p','map-note',"Drag the sliders to change influence. Percentages update together. Click a name to inspect its source.");root.append(chance);
 const rule=el('div','map-rule');rule.append(el('span','map-flow-arrow','↓'),el('strong','',"FBS relations"));
 if(data.relations.length){rule.append(el('p','hint',data.relationsEnabled?"Active relations constrain the possible combinations.":"Proposed relations — enable them to investigate their effect."));const list=el('ul','map-relations');for(const r of data.relations){const item=el('li',r.enabled&&data.relationsEnabled?'relation-active':'relation-proposed',relationLabel(r));list.append(item);}rule.append(list);}
 else if(system.rule.enabled)rule.append(el('p','','B: '+system.rule.trigger+' → C: '+system.rule.allowed.join(' / ')));
 else rule.append(el('p','',"No relations yet. Add a connection to shape the system."));
 root.append(rule);
 const outputs=el('section','map-outcomes');outputs.append(el('h3','',"Possible outcomes"));const proposals=el('div','map-output-grid');data.outputs.forEach(text=>proposals.append(el('p','',text)));outputs.append(proposals);root.append(outputs);
 const update=next=>{const updated=mapData(next);updated.collections.forEach((c,i)=>{const weights=ingredientWeights(next,i);c.items.forEach((item,j)=>{const ref=weightNodes[i][j];if(!ref)return;const percentage=(item.probability*100).toLocaleString('en-GB',{maximumFractionDigits:1})+'%';ref.value.textContent=percentage;ref.bar.style.width=(item.probability*100)+'%';ref.slider.max=String(Math.max(Number(ref.slider.max),Math.ceil(weights[j])));ref.slider.value=String(weights[j]);ref.slider.setAttribute('aria-valuetext',percentage+" probability");});});proposals.replaceChildren(...updated.outputs.map(text=>el('p','',text)));};
 update(system);return {update};
}
