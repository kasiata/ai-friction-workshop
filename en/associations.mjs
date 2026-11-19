// Authored association paths: three explicit links, with a concrete design interpretation.
export const associationRoutes=[
 {words:["bench",'bench',"chair",'chair',"sitting",'seat'],steps:["park","forest","mushroom"],detail:"A giant mushroom forms a shared canopy with soft, glowing seats."},
 {words:["bench",'bench',"chair",'chair',"waiting",'waiting'],steps:["clock","time","tide"],detail:"A slowly moving floor lets seating islands drift towards and away from each other."},
 {words:["table",'table',"food",'food',"meal",'meal'],steps:["taste","ritual","mask"],detail:"Visitors choose a mask that determines their role in a shared eating ritual."},
 {words:["food",'food',"coffee",'coffee',"sharing",'sharing'],steps:["fermentation","bubble","hot-air balloon"],detail:"A transparent hot-air balloon above the group grows whenever someone contributes something."},
 {words:["wall",'wall',"border",'border',"nook",'nook',"place",'place'],steps:["inspection","passport","island"],detail:"Islands on wheels receive invented passports that let visitors move between groups."},
 {words:["story",'story',"stories",'stories',"memory",'memory'],steps:["image","dream","labyrinth"],detail:"A labyrinth of translucent fabric changes its route when visitors add a memory to it."},
 {words:["question",'question',"questions",'questions',"conversation",'conversation'],steps:["riddle","secret","trapdoor"],detail:"A hidden trapdoor opens a small room when two visitors solve a riddle together."},
 {words:["quiet",'quiet',"silent",'silent',"calm",'calm'],steps:["night","stars","planetarium"],detail:"A portable planetarium projects imaginary constellations that visitors name together."},
 {words:["playful",'playful',"game",'game',"surprising",'surprising'],steps:["rule","chance","dice"],detail:"A table-sized die determines how visitors rearrange the space each time."},
 {words:["welcoming",'welcoming',"welcome",'welcome',"access",'access'],steps:["door","threshold","portal"],detail:"A rotating portal swaps the entrance and exit when two strangers step through together."},
 {words:["drawing",'drawing',"drawing",'draw',"line",'line'],steps:["gesture","thread","spiderweb"],detail:"A web of elastic threads lets visitors draw by changing its tension together."},
 {words:["building",'build','building',"making",'making',"cooperation",'cooperate'],steps:["tool","robot","swarm"],detail:"A swarm of small robots rearranges components in response to the movements of the group."},
 {words:["energetic",'energetic',"energy",'energy',"light",'light'],steps:["electricity","magnet","levitation"],detail:"Floating magnetic objects respond to hand gestures and form a shifting landscape between visitors."},
 {words:["sound",'sound',"voice",'voice',"speaking",'speak'],steps:["echo","cave","bat"],detail:"A bat-like listening canopy translates soft sounds into light patterns above the participants."},
 {words:["sign",'sign',"table sign",'sticker',"lanyard",'lanyard'],steps:["arrow","compass","expedition"],detail:"A rotating compass sends visitors on an expedition past meeting stations they build themselves."},
 {words:["host",'host',"host","volunteer",'volunteer',"facilitator",'facilitator'],steps:["guide","journey","caravan"],detail:"A caravan of linked seating modules moves through the building, picking up new participants along the way."},
 {words:["weekly",'weekly',"time slot",'timeslot',"time",'time'],steps:["calendar","season","migratory bird"],detail:"A cloud of paper migratory birds travels with visitors and lands at a different meeting place each time."},
 {words:['contact',"meeting",'meeting',"strangers",'strangers',"accessibility",'accessibility'],steps:["handshake","ritual","mask"],detail:"Two visitors build one large mask that can only be worn when they coordinate their movements."},
 {words:["garden",'garden','plant',"flower",'flower',"growing",'grow'],steps:["seed","wind","kite"],detail:"A field of controllable kites makes cooperation between visitors visible above their heads."},
 {words:['water',"ice",'ice',"sea",'sea'],steps:["ocean","coral","reef"],detail:"An inflatable reef forms temporary rooms that grow when more visitors cooperate."}
];
const alternatives=[
 [2,["sharing","network","spiderweb"],10],[3,["scent","dream","labyrinth"],5],
 [4,["paper","folding","migratory bird"],16],[5,["sound","echo","bat"],13],
 [6,["curiosity","discovery","compass"],14],[7,["breath","wind","kite"],18],
 [8,["theatre","story","labyrinth"],5],[9,["handshake","ritual","mask"],17],
 [10,["ink","night","planetarium"],7],[11,["building block","automation","swarm"],11],
 [12,["sun","sky","hot-air balloon"],3],[13,["vibration",'water',"reef"],19],
 [14,["message","riddle","trapdoor"],6],[15,["story","dream","labyrinth"],5],
 [16,["cycle","orbit","planetarium"],7],[17,["network","thread","spiderweb"],10],
 [18,["roots","network","swarm"],11],[19,["current","electricity","magnet"],12]
];
associationRoutes.push(...alternatives.map(([from,steps,to])=>({words:associationRoutes[from].words,steps,detail:associationRoutes[to].detail})));
const folded=text=>text.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase();
export function associationStarts(){return [...new Set(associationRoutes.map(route=>route.words[0]))];}
export function associateThree(source,random=Math.random,previous=null){
 const tokens=folded(source).match(/[\p{L}]+/gu)||[],candidates=[];
 for(const route of associationRoutes){const word=route.words.find(word=>tokens.includes(folded(word)));if(word)candidates.push({source,chain:[word,...route.steps],detail:route.detail});}
 if(!candidates.length)throw Error("Choose another starting word, such as bench, story, question, drawing or energy.");
 const different=candidates.filter(candidate=>JSON.stringify(candidate.chain)!==JSON.stringify(previous?.chain)),options=different.length?different:candidates;
 const result=options[Math.min(options.length-1,Math.floor(Math.max(0,random())*options.length))];
 return {...result,enabled:true};
}
