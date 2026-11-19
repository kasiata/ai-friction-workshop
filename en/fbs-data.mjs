export const fbsGroups=[["more contact between strangers","a lower barrier to joining in","regular social contact"],["visitors start a conversation","visitors feel able to join the table","visitors return at regular times"],["recognisable table sign","shared conversation table","regular host","weekly time slot","quiet individual seat"]];
const edge=(type,a,from,b,to)=>({type,from:{group:a,item:fbsGroups[a][from]},to:{group:b,item:fbsGroups[b][to]},enabled:true});
export const fbsRelations=[edge('realises',1,0,0,0),edge('realises',1,1,0,1),edge('realises',1,2,0,2),edge('enables',2,0,1,1),edge('enables',2,1,1,0),edge('enables',2,2,1,0),edge('enables',2,3,1,2),edge('inhibits',2,4,1,0)];
export const fbsLabels=["Function · why?","Behaviour · what happens?","Structure · with what?"];
export const fbsTemplate="Goal: {A}. Expected behaviour: {B}. Explore as structure: {C}.";
