export function generationSeed(current,fixed,draw){
 const next=fixed?Number(current):Number(draw());
 if(!Number.isInteger(next)||next<0||next>4294967295)throw Error("Invalid draw. Try a new draw.");
 return next;
}
