import {validate,distribution,generate} from './engine.mjs?v=dfb8862ba839';
export function ingredientWeights(system,group){return system.selections[group].model==='custom'?[...system.selections[group].weights]:distribution(system.groups[group],system.selections[group]).map(p=>p*system.groups[group].length);}
export function setIngredientWeight(system,group,index,weight){
 validate(system);if(!Number.isInteger(group)||group<0||group>2||!Number.isInteger(index)||index<0||index>=system.groups[group].length||!Number.isFinite(weight)||weight<0||weight>1000000)throw Error('Kies een geldig ingrediënt en een gewicht tussen 0 en 1000000.');
 const next=structuredClone(system),weights=ingredientWeights(system,group);weights[index]=weight;if(!weights.some(w=>w>0))throw Error('Minstens één ingrediënt in deze verzameling moet kans houden.');next.selections[group]={...next.selections[group],model:'custom',weights};validate(next);generate(next);return next;
}
