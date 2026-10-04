/** Expand only the front landscape. Desk, courtyard and rear view retain their
 * authored coordinates. The positive derivative keeps the terrain continuous. */
export function vistaSpread(z:number){
 const t=Math.max(0,Math.min(1,(-z-35)/90));
 return 1+2*t*t*(3-2*t);
}
export function distantPosition([x,y,z]:readonly[number,number,number]):[number,number,number]{
 const spread=vistaSpread(z);return [x*spread,y,z*spread];
}
