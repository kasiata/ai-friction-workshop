export const fbsGroups=[['meer contact tussen onbekenden','een lagere drempel om mee te doen','regelmatig sociaal contact'],['bezoekers beginnen een gesprek','bezoekers durven aan te schuiven','bezoekers keren op vaste momenten terug'],['herkenbaar tafelbord','gedeelde gesprekstafel','vaste gastheer of gastvrouw','wekelijks tijdslot','stille individuele zitplek']];
const edge=(type,a,from,b,to)=>({type,from:{group:a,item:fbsGroups[a][from]},to:{group:b,item:fbsGroups[b][to]},enabled:true});
export const fbsRelations=[edge('realises',1,0,0,0),edge('realises',1,1,0,1),edge('realises',1,2,0,2),edge('enables',2,0,1,1),edge('enables',2,1,1,0),edge('enables',2,2,1,0),edge('enables',2,3,1,2),edge('inhibits',2,4,1,0)];
export const fbsLabels=['Functie · waarom?','Gedrag · wat gebeurt er?','Structuur · waarmee?'];
export const fbsTemplate='Doel: {A}. Verwacht gedrag: {B}. Verken als structuur: {C}.';
