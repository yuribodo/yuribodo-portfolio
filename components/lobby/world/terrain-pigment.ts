import {TRAIL_MAP_SIZE,TRAIL_MAP_EXTENT,TRAIL_MAP_X,TRAIL_MAP_Z} from '@/lib/lobby/valley-trails';
import { RIVER_LEVEL_GLSL } from "@/lib/lobby/world-geography";
import type { TerrainData } from "@/lib/lobby/terrain-data-format";
import {DataTexture,LinearFilter,RGBAFormat,MeshStandardMaterial,Vector2,type Texture} from 'three';
// Soft canopy occlusion is baked from the actual tree placements at build time.
// It follows the terrain in world space and avoids an additional shadow render pass.
export function groundMaterial(textures:Texture[], baked:TerrainData){
  const [map,normalMap,grassMap,grassNormal,rockMap,rockNormal]=textures;
  const canopy=new DataTexture(baked.canopy,512,512,RGBAFormat);canopy.minFilter=canopy.magFilter=LinearFilter;canopy.needsUpdate=true;
  const trails=new DataTexture(baked.trails,TRAIL_MAP_SIZE,TRAIL_MAP_SIZE,RGBAFormat);trails.minFilter=trails.magFilter=LinearFilter;trails.needsUpdate=true;
  const material=new MeshStandardMaterial({map,normalMap,normalScale:new Vector2(.8,.8),roughness:1,envMapIntensity:.15});
  material.userData.preloadTextures=[map,normalMap,grassMap,grassNormal,rockMap,rockNormal,canopy,trails];
  material.userData.disposeGroundTextures=()=>{canopy.dispose();trails.dispose();for(const t of [map,normalMap,grassMap,grassNormal,rockMap,rockNormal])t.dispose();};
  material.onBeforeCompile=shader=>{
    shader.uniforms.canopyMap={value:canopy};shader.uniforms.trailMap={value:trails};
    shader.uniforms.rockMap={value:rockMap};shader.uniforms.rockNormal={value:rockNormal};shader.uniforms.meadowMap={value:grassMap};shader.uniforms.meadowNormal={value:grassNormal};
    shader.vertexShader='attribute vec3 landDomain;attribute vec3 landDomainNormal;varying vec3 vGeologyNormal;varying vec3 vSurfacePosition;varying vec3 vLandPosition;varying vec3 vLandNormal;varying float vLandHeight;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`
      #include <begin_vertex>
      vSurfacePosition=(modelMatrix*vec4(transformed,1.0)).xyz;vLandHeight=transformed.y;vGeologyNormal=landDomainNormal;
      vLandPosition=(modelMatrix*vec4(landDomain,1.0)).xyz;
      vLandNormal=normalize(mat3(modelMatrix)*objectNormal);
    `);
    shader.fragmentShader=`varying vec3 vGeologyNormal;uniform sampler2D rockNormal;varying vec3 vSurfacePosition;varying vec3 vLandPosition;varying vec3 vLandNormal;varying float vLandHeight;uniform sampler2D trailMap;uniform sampler2D canopyMap;uniform sampler2D rockMap;uniform sampler2D meadowMap;uniform sampler2D meadowNormal;
      float groundHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float groundNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
      return mix(mix(groundHash(i),groundHash(i+vec2(1,0)),f.x),mix(groundHash(i+vec2(0,1)),groundHash(i+vec2(1,1)),f.x),f.y);}
      // Blending two offset samples breaks obvious rows without extra textures.
      vec4 groundSample(sampler2D tex,vec2 uv,float blend){
        return mix(texture2D(tex,uv),texture2D(tex,uv+vec2(.37,.61)),blend);
      }
    `+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
      vec3 p=vLandPosition;
      float broad=groundNoise(p.xz*.035+groundNoise(p.xz*.08)*2.0);
      float soilPatch=groundNoise(p.xz*.19),detail=groundNoise(p.xz*1.7);
      float slope=1.0-normalize(vLandNormal).y;
      float rockSlope=mix(slope,1.0-normalize(vGeologyNormal).y,.30);
      float route=1000.0;
      if(length(p.xz)<32.0)route=abs(p.x-sin(p.z*.17)*1.6);
      if(p.z< -7.0&&p.z> -275.0){
        float river=22.0+sin(p.z*.014)*28.0+sin(p.z*.035+.8)*8.0;
        float width=5.5+(1.0+sin(p.z*.023))*2.2;
        float center=mix(sin(p.z*.07)*1.5,river-width-9.0,smoothstep(0.0,60.0,-p.z-7.0));
        route=min(route,abs(p.x-center)*.73);
      }
      if(p.z>7.0&&p.z<145.0){float t=(p.z-7.0)/138.0;route=min(route,abs(p.x-(-12.0*t+sin(t*3.14159)*6.0)));}
      float verge=.82+groundNoise(p.xz*.7)*.55;
      float pathCover=smoothstep(verge-.3,verge+.5,route+(detail-.5)*.28);
      // Broken grass in the centre of the trail, compacted wheel/foot tracks.
      float median=(1.0-smoothstep(.15,.48,route))*smoothstep(.32,.7,soilPatch)*.52;
      vec2 trailUv=(p.xz-vec2(${TRAIL_MAP_X.toFixed(1)},${TRAIL_MAP_Z.toFixed(1)}))/${TRAIL_MAP_EXTENT.toFixed(1)};
      float trail=texture2D(trailMap,trailUv).r;
      float plantCover=max(pathCover,median)*(1.0-trail*.97);
      plantCover*=.88+.12*smoothstep(.23,.52,soilPatch+broad*.28);
      plantCover*=1.0-smoothstep(.12,.36,slope+detail*.07);
      float wetBank=1.0-smoothstep(.5,3.7,vLandHeight-${RIVER_LEVEL_GLSL});
      plantCover*=1.0-wetBank*.8;
      float tileBlend=smoothstep(.2,.8,groundNoise(p.xz*.33));
      vec4 soilTexel=groundSample(map,vMapUv,tileBlend);
      vec2 meadowUv=vMapUv*1.6;
      vec3 meadowTexel=groundSample(meadowMap,meadowUv,tileBlend).rgb;
      float soilValue=dot(soilTexel.rgb,vec3(.2126,.7152,.0722));
      float grassValue=dot(meadowTexel,vec3(.2126,.7152,.0722));
      vec3 soil=mix(vec3(.068,.047,.028),vec3(.32,.255,.16),smoothstep(.01,.55,soilValue));
      soil*=.78+soilPatch*.4;
      vec3 grass=mix(vec3(.012,.055,.025),vec3(.15,.29,.062),smoothstep(.008,.4,grassValue));
      float farMeadow=smoothstep(35.0,90.0,-p.z);
      grass=mix(grass,meadowTexel*vec3(.52,.82,.46)+vec3(.006,.014,.005),farMeadow*.75);
      // Meadow colour remains readable when fine surface texture becomes subpixel.
      grass*=.62+broad*.8;
      float sunnyMeadow=smoothstep(.35,.75,groundNoise(p.xz*.018+vec2(8.0,3.0)));
      grass=mix(grass,grass*vec3(1.38,1.12,.74),sunnyMeadow*.65);
      grass=mix(grass,grass*vec3(1.17,1.01,.77),smoothstep(.55,.8,soilPatch)*.45);
      // Contour-following fields sit in the cultivated valley, divided by
      // grassy banks. Their metre-scale furrows fade before they alias.
      float cultivated=smoothstep(-60.0,-54.0,p.x)*(1.0-smoothstep(-25.0,-20.0,p.x))
        *smoothstep(-278.0,-266.0,p.z)*(1.0-smoothstep(-151.0,-140.0,p.z));
      vec2 fieldUv=vec2(p.x+sin(p.z*.035)*2.0,p.z)*vec2(.08,.042);
      vec2 cell=fract(fieldUv);
      float border=min(min(cell.x,1.0-cell.x),min(cell.y,1.0-cell.y));
      float field=cultivated*smoothstep(.035,.09,border)*(1.0-smoothstep(.045,.17,slope));
      float harvest=groundHash(floor(fieldUv));
      vec3 crops=mix(grass*vec3(.92,1.13,.75),vec3(.25,.25,.067),smoothstep(.35,.8,harvest));
      float furrow=cos(p.z*4.5+p.x*.25);
      crops*=1.0+furrow*.10*(1.0-smoothstep(.5,1.5,fwidth(p.z*4.5)));
      grass=mix(grass,crops,field);
      vec3 pigment=mix(soil,grass,plantCover);
      float crag=smoothstep(.12,.32,rockSlope+(soilPatch-.5)*.12);
      vec3 weights=pow(abs(normalize(vLandNormal)),vec3(4.0));weights/=dot(weights,vec3(1.0));
      float rockTileBlend=smoothstep(.18,.82,groundNoise(vSurfacePosition.xz*.07+vSurfacePosition.y*.11));
      vec3 rockTexel=groundSample(rockMap,vSurfacePosition.zy/12.0,rockTileBlend).rgb*weights.x
        +groundSample(rockMap,vSurfacePosition.xz/12.0,rockTileBlend).rgb*weights.y+groundSample(rockMap,vSurfacePosition.xy/12.0,rockTileBlend).rgb*weights.z;
      // Retain the scan's colour and fissures instead of flattening it into
      // two grey values. Large strata and fine cracks respond independently.
      float rockValue=dot(rockTexel,vec3(.2126,.7152,.0722));
      vec3 stone=mix(rockTexel,vec3(rockValue),.78)*vec3(.79,.91,1.00);
      float strata=.92+.08*sin(p.y*.72+groundNoise(p.xz*.12)*4.5);
      stone*=strata;
      stone=mix(stone,vec3(.042,.058,.039),smoothstep(.60,.78,soilPatch)*.18);
      float chessRegion=smoothstep(45.0,105.0,p.x)*smoothstep(140.0,250.0,-p.z)*(1.0-smoothstep(390.0,470.0,-p.z));
      stone=mix(stone,stone*vec3(1.05,.88,1.32),chessRegion*.8);
      pigment=mix(pigment,stone,crag);
      pigment*=1.0-wetBank*.32;
      float canopyShade=texture2D(canopyMap,p.xz/800.0+.5).r;
      pigment*=mix(vec3(.68,.80,.86),vec3(1.0),canopyShade)*canopyShade;
      diffuseColor.rgb*=pigment;
    `);
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`
      #ifdef USE_NORMALMAP_TANGENTSPACE
        vec3 soilN=groundSample(normalMap,vNormalMapUv,tileBlend).xyz*2.0-1.0;
        vec3 grassN=groundSample(meadowNormal,vNormalMapUv*1.6,tileBlend).xyz*2.0-1.0;
        vec3 groundN=normalize(mix(soilN,grassN,plantCover));groundN.xy*=normalScale;
        normal=normalize(tbn*groundN);
        vec3 rockX=groundSample(rockNormal,vSurfacePosition.zy/12.0,rockTileBlend).xyz*2.0-1.0;
        vec3 rockY=groundSample(rockNormal,vSurfacePosition.xz/12.0,rockTileBlend).xyz*2.0-1.0;
        vec3 rockZ=groundSample(rockNormal,vSurfacePosition.xy/12.0,rockTileBlend).xyz*2.0-1.0;
        vec3 n=normalize(vLandNormal);
        // Whiteout blend in each projection's tangent frame.
        vec3 nx=vec3(n.x*abs(rockX.z),n.y+rockX.y*.6,n.z+rockX.x*.6);
        vec3 ny=vec3(n.x+rockY.x*.6,n.y*abs(rockY.z),n.z+rockY.y*.6);
        vec3 nz=vec3(n.x+rockZ.x*.6,n.y+rockZ.y*.6,n.z*abs(rockZ.z));
        vec3 rockN=normalize(mat3(viewMatrix)*normalize(nx*weights.x+ny*weights.y+nz*weights.z));
        float rockDetail=1.0-smoothstep(180.0,1000.0,length(vViewPosition))*.75;
        normal=normalize(mix(normal,rockN,crag*rockDetail));
      #endif
    `);
  };
  material.customProgramCacheKey=()=> 'geological-ground-v10-trails';return material;
}
