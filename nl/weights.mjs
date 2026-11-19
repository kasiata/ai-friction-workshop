import {validate,distribution,generate} from './engine.mjs?v=86cc2ddaa7c5';
export function ingredientWeights(system,group){return system.selections[group].model==='custom'?[...system.selections[group].weights]:distribution(system.groups[group],system.selections[group]).map(p=>p*system.groups[group].length);}
export function setIngredientWeight(system,group,index,weight){
 validate(system);if(!Number.isInteger(group)||group<0||group>2||!Number.isInteger(index)||index<0||index>=system.groups[group].length||!Number.isFinite(weight)||weight<0||weight>1000000)throw Error('Kies een geldig ingrediënt en een gewicht tussen 0 en 1000000.');
 const next=structuredClone(system),weights=ingredientWeights(system,group);weights[index]=weight;if(!weights.some(w=>w>0))throw Error('Minstens één ingrediënt in deze verzameling moet kans houden.');next.selections[group]={...next.selections[group],model:'custom',weights};validate(next);generate(next);return next;
}

// Set an actual percentage, sharing the remainder proportionally across the other items.
export function chanceSelection(group,selection,index,percent){
 const probabilities=distribution(group,selection);
 if(!Number.isInteger(index)||index<0||index>=group.length||!Number.isFinite(percent)||percent<0||percent>100)throw Error('Kies een geldig item en een kans tussen 0 en 100%.');
 if(group.length===1&&percent!==100)throw Error('Eén item heeft altijd 100% kans. Voeg een tweede item toe om kansen te verdelen.');
 const rest=probabilities.reduce((sum,p,i)=>sum+(i===index?0:p),0),remaining=100-percent;
 const weights=probabilities.map((p,i)=>i===index?percent:rest>0?p/rest*remaining:remaining/(group.length-1));
 return {...selection,model:'custom',weights};
}
export function presetSelection(name,selection){
 const presets={equal:{model:'uniform'},first:{model:'exponential',direction:'start',rate:3},last:{model:'exponential',direction:'end',rate:3},middle:{model:'normal',center:0.5,spread:0.2},peak:{model:'triangular',center:0.5,spread:0.5},'tail-first':{model:'zipf',direction:'start',exponent:1.2},'tail-last':{model:'zipf',direction:'end',exponent:1.2}};
 if(!Object.hasOwn(presets,name))throw Error('Kies een bestaande kansverdeling.');
 return {...selection,...presets[name]};
}
export function selectionPresetName(selection){
 switch(selection.model){case 'uniform':return 'equal';case 'exponential':return selection.direction==='end'?'last':'first';case 'normal':return selection.center===0.5?'middle':'custom';case 'triangular':return 'peak';case 'zipf':return selection.direction==='end'?'tail-last':'tail-first';default:return 'custom';}
}
