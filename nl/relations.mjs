export const relationTypes={realises:'realiseert',enables:'maakt mogelijk',requires:'vereist',inhibits:'belemmert'};
export const relationEndpoints={realises:[1,0],enables:[2,1],requires:[1,2],inhibits:[2,1]};
export function validateRelations(relations,groups,{references=true}={}){
 if(relations==null)return [];
 if(!Array.isArray(relations)||relations.length>100)throw Error('Gebruik maximaal 100 FBS-relaties.');
 for(const r of relations){
  if(!r||!Object.hasOwn(relationEndpoints,r.type)||typeof r.enabled!=='boolean'||!r.from||!r.to||typeof r.from.item!=='string'||typeof r.to.item!=='string'||r.from.item.length>500||r.to.item.length>500)throw Error('Ongeldige FBS-relatie.');
  const [a,b]=relationEndpoints[r.type];if(r.from.group!==a||r.to.group!==b)throw Error('Dit relatietype verbindt andere FBS-categorieën.');
  if(r.quote!==undefined&&(typeof r.quote!=='string'||r.quote.length>1000))throw Error('Een relatiecitaat mag maximaal 1000 tekens bevatten.');
  if(references&&r.enabled&&(!groups[a].includes(r.from.item)||!groups[b].includes(r.to.item)))throw Error('Een actieve relatie verwijst naar een verwijderd ingrediënt. Pas de relatie aan of zet haar uit.');
 }
 return relations;
}
export function relationCandidates(system,group,selected){
 if(!system.relationsEnabled)return null;
 const edges=(system.relations||[]).filter(r=>r.enabled);let allowed=null;const excluded=new Set(),used=[];
 if(group===1&&selected[0]!==undefined){const links=edges.filter(r=>r.type==='realises'&&r.to.item===selected[0]);if(links.length){allowed=new Set(links.map(r=>r.from.item));used.push(...links);}}
 if(group===2&&selected[1]!==undefined){
  const links=edges.filter(r=>r.type==='enables'&&r.to.item===selected[1]);if(links.length){allowed=new Set(links.map(r=>r.from.item));used.push(...links);}
  const required=edges.filter(r=>r.type==='requires'&&r.from.item===selected[1]);const targets=new Set(required.map(r=>r.to.item));if(targets.size>1)throw Error('Dit gedrag vereist meerdere losse structuren. Maak er één samengesteld structuur-ingrediënt van.');
  if(targets.size){allowed=allowed?new Set([...allowed].filter(x=>targets.has(x))):targets;used.push(...required);}
  const blocked=edges.filter(r=>r.type==='inhibits'&&r.to.item===selected[1]);blocked.forEach(r=>excluded.add(r.from.item));used.push(...blocked);
 }
 return {allowed,excluded,used};
}
export function relationLabel(r){return r.from.item+' → '+relationTypes[r.type]+' → '+r.to.item;}
