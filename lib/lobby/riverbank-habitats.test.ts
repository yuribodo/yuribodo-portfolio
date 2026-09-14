import test from 'node:test';
import assert from 'node:assert/strict';
import {riverbankPlants,RIVER_STOPS} from './riverbank-habitats';
import {riverLevel,riverCenter,worldHeight,VISTA_STREAMS,vistaStream} from './world-geography';

test('riparian habitat leaves water, bridges, landing access and cascades clear',()=>{
 const plants=riverbankPlants(0);
 assert.ok(plants.length>100,'the river habitat unexpectedly disappeared');
 for(const {position:[x,,z]}of plants){
  assert.ok(worldHeight(x,z)>riverLevel(z)+.3,'plant rooted underwater');
  for(const bridge of [-96,-172])assert.ok(Math.abs(z-bridge)>=6,'bridge obscured');
  for(const stop of RIVER_STOPS)assert.ok(Math.abs(z-stop.z)>=5||Math.sign(x-riverCenter(z))!==stop.side,'landing access obscured');
  for(let i=0;i<VISTA_STREAMS.length;i++)for(let j=0;j<=80;j++){
   const stream=vistaStream(i,j/80);
   assert.ok(Math.hypot(x-stream.x,z-stream.z)>stream.width*.5+1.5,'waterfall obstructed');
  }
 }
});
