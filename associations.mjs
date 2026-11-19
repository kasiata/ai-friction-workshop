// Authored association paths: three explicit links, with a concrete design interpretation.
export const associationRoutes=[
 {words:['bank','bench','stoel','chair','zitten','seat'],steps:['park','bos','paddenstoel'],detail:'Een reusachtige paddenstoel vormt een gedeeld afdak met zachte, lichtgevende zitplekken.'},
 {words:['bank','bench','stoel','chair','wachten','waiting'],steps:['klok','tijd','getij'],detail:'Een langzaam bewegende vloer laat zitplekken als eilanden naar elkaar toe en van elkaar af drijven.'},
 {words:['tafel','table','eten','food','maaltijd','meal'],steps:['smaak','ritueel','masker'],detail:'Bezoekers kiezen een masker dat hun rol in een gezamenlijk eetritueel bepaalt.'},
 {words:['eten','food','koffie','coffee','delen','sharing'],steps:['gisting','luchtbel','luchtballon'],detail:'Een doorzichtige luchtballon boven de groep groeit telkens wanneer iemand iets bijdraagt.'},
 {words:['wand','wall','grens','border','nis','nook','plek','place'],steps:['controle','paspoort','eiland'],detail:'Losse eilanden op wielen krijgen zelfverzonnen paspoorten waarmee bezoekers van groep kunnen wisselen.'},
 {words:['verhaal','story','verhalen','stories','herinnering','memory'],steps:['beeld','droom','doolhof'],detail:'Een doolhof van doorschijnende doeken verandert van route wanneer bezoekers er een herinnering aan toevoegen.'},
 {words:['vraag','question','vragen','questions','gesprek','conversation'],steps:['raadsel','geheim','luik'],detail:'Een verborgen luik opent een kleine kamer zodra twee bezoekers samen een raadsel oplossen.'},
 {words:['rustig','quiet','stil','silent','rust','calm'],steps:['nacht','sterren','planetarium'],detail:'Een draagbaar planetarium projecteert denkbeeldige sterrenbeelden die bezoekers samen een naam geven.'},
 {words:['speels','playful','spel','game','verrassend','surprising'],steps:['spelregel','toeval','dobbelsteen'],detail:'Een dobbelsteen ter grootte van een tafel bepaalt hoe bezoekers de ruimte telkens opnieuw indelen.'},
 {words:['uitnodigend','welcoming','welkom','welcome','toegang','access'],steps:['deur','drempel','portaal'],detail:'Een draaiend portaal verwisselt de ingang en uitgang zodra twee onbekenden er tegelijk doorheen stappen.'},
 {words:['tekenen','drawing','tekening','draw','lijn','line'],steps:['gebaar','draad','spinnenweb'],detail:'Een web van elastische draden laat bezoekers tekenen door samen de spanning van het netwerk te veranderen.'},
 {words:['bouwen','build','building','maken','making','samenwerken','cooperate'],steps:['gereedschap','robot','zwerm'],detail:'Een zwerm kleine robots herschikt de onderdelen in reactie op de bewegingen van de groep.'},
 {words:['energiek','energetic','energie','energy','licht','light'],steps:['elektriciteit','magneet','zweven'],detail:'Zwevende magnetische objecten reageren op handgebaren en vormen tussen bezoekers een veranderlijk landschap.'},
 {words:['geluid','sound','stem','voice','praten','speak'],steps:['echo','grot','vleermuis'],detail:'Een vleermuisachtige luisterkap vertaalt zachte geluiden naar lichtpatronen boven de deelnemers.'},
 {words:['bord','sign','tafelbord','sticker','naamkoord','lanyard'],steps:['pijl','kompas','expeditie'],detail:'Een draaiend kompas stuurt bezoekers op een expeditie langs zelfgebouwde ontmoetingsposten.'},
 {words:['gastheer','host','gastvrouw','vrijwilliger','volunteer','begeleider','facilitator'],steps:['gids','reis','karavaan'],detail:'Een karavaan van gekoppelde zitmodules verplaatst zich door het gebouw en neemt onderweg nieuwe deelnemers mee.'},
 {words:['wekelijks','weekly','tijdslot','timeslot','tijd','time'],steps:['kalender','seizoen','trekvogel'],detail:'Een wolk van papieren trekvogels trekt met de bezoekers mee en landt telkens op een andere ontmoetingsplek.'},
 {words:['contact','ontmoeting','meeting','onbekenden','strangers','toegankelijkheid','accessibility'],steps:['handdruk','ritueel','masker'],detail:'Twee bezoekers bouwen samen één groot masker dat alleen gedragen kan worden wanneer zij hun bewegingen afstemmen.'},
 {words:['tuin','garden','plant','bloem','flower','groeien','grow'],steps:['zaad','wind','vlieger'],detail:'Een veld van bestuurbare vliegers maakt de samenwerking tussen bezoekers zichtbaar boven hun hoofden.'},
 {words:['water','ijs','ice','zee','sea'],steps:['oceaan','koraal','rif'],detail:'Een opblaasbaar rif vormt tijdelijke kamers die groter worden wanneer meer bezoekers samenwerken.'}
];
const alternatives=[
 [2,['delen','netwerk','spinnenweb'],10],[3,['geur','droom','doolhof'],5],
 [4,['papier','vouwen','trekvogel'],16],[5,['geluid','echo','vleermuis'],13],
 [6,['nieuwsgierigheid','ontdekking','kompas'],14],[7,['adem','wind','vlieger'],18],
 [8,['theater','verhaal','doolhof'],5],[9,['handdruk','ritueel','masker'],17],
 [10,['inkt','nacht','planetarium'],7],[11,['bouwblok','automatisering','zwerm'],11],
 [12,['zon','lucht','luchtballon'],3],[13,['trilling','water','rif'],19],
 [14,['boodschap','raadsel','luik'],6],[15,['verhaal','droom','doolhof'],5],
 [16,['cyclus','baan','planetarium'],7],[17,['netwerk','draad','spinnenweb'],10],
 [18,['wortels','netwerk','zwerm'],11],[19,['stroming','elektriciteit','magneet'],12]
];
associationRoutes.push(...alternatives.map(([from,steps,to])=>({words:associationRoutes[from].words,steps,detail:associationRoutes[to].detail})));
const folded=text=>text.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase();
export function associationStarts(){return [...new Set(associationRoutes.map(route=>route.words[0]))];}
export function associateThree(source,random=Math.random,previous=null){
 const tokens=folded(source).match(/[\p{L}]+/gu)||[],candidates=[];
 for(const route of associationRoutes){const word=route.words.find(word=>tokens.includes(folded(word)));if(word)candidates.push({source,chain:[word,...route.steps],detail:route.detail});}
 if(!candidates.length)throw Error('Kies een ander startwoord, bijvoorbeeld bank, verhaal, vraag, tekenen of energie.');
 const different=candidates.filter(candidate=>JSON.stringify(candidate.chain)!==JSON.stringify(previous?.chain)),options=different.length?different:candidates;
 const result=options[Math.min(options.length-1,Math.floor(Math.max(0,random())*options.length))];
 return {...result,enabled:true};
}
