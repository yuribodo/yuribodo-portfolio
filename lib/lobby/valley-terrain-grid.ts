/** Refine only the waterfall corridors; the remaining valley keeps its original grid. */
const positive=[0];
for(let v=3;v<85;v+=3)positive.push(v);
positive.push(85);
for(let v=87;v<240;v+=2)positive.push(v);
for(let v=240;v<=900;v+=10)positive.push(v);
const samples=new Set([...positive.slice(1).reverse().map(v=>-v),...positive]);
for(const [start,end]of [[-52,-42],[-27,-14],[47,59],[20,33],[-130,-111],[-179,-160]]){
 for(let value=start;value<=end;value++)samples.add(value);
}
export const VALLEY_AXIS=[...samples].sort((a,b)=>a-b);
