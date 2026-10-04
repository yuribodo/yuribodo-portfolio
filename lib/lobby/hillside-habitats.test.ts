import test from 'node:test';
import assert from 'node:assert/strict';
import {hillsidePlants,hillsideSurface} from './hillside-habitats';
import {worldHeight,VISTA_STREAMS,vistaStream,riverCenter,riverWidth} from './world-geography';
import {VALLEY_AXIS} from './valley-terrain-grid';
import {HAMLETS} from './fantasy-landmarks';

test('hillside roots match rendered grid vertices and stay continuous at cell edges',()=>{
 for(const x of VALLEY_AXIS.filter(x=>x>=-150&&x<=150).filter((_,i)=>i%9===0)){
  for(const z of [-95,-120,-125,-170,-250,-320]){
   assert.ok(Math.abs(hillsideSurface(x,z)-worldHeight(x,z))<1e-8,'root not on grid vertex');
   assert.ok(Math.abs(hillsideSurface(x-.00001,z)-hillsideSurface(x+.00001,z))<.001,'root height jumps at cell edge');
  }
 }
});

test('new slope groves preserve both village clearings and water corridors',()=>{
 const plants=hillsidePlants(-1.5);
 assert.ok(plants.some(p=>p.position[0]<0)&&plants.some(p=>p.position[0]>0));
 for(const {position:[x,y,z]}of plants){
  assert.ok(z<=-85,'slope planting encroaches on the near terrace');
  assert.ok(Number.isFinite(y)&&y<-1.5+hillsideSurface(x,z),'floating roots');
  assert.ok(Math.abs(x-riverCenter(z))>=riverWidth(z)+18,'river corridor obscured');
  for(const [hx,hz]of HAMLETS)assert.ok(Math.hypot(x-hx,z-hz)>=16,'village clearing obscured');
  for(let i=0;i<VISTA_STREAMS.length;i++)for(let j=0;j<=64;j++){
   const stream=vistaStream(i,j/64);
   assert.ok(Math.hypot(x-stream.x,z-stream.z)>=stream.width*.5+10,'waterfall corridor obscured');
  }
 }
});
