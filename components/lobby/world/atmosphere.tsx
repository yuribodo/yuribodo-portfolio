"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  BackSide, BoxGeometry, Color, Data3DTexture, LinearFilter, Mesh,
  PMREMGenerator, RGBAFormat, Scene, ShaderMaterial, SphereGeometry, Vector3, Matrix4, type WebGLRenderer,
  HalfFloatType, PlaneGeometry, WebGLRenderTarget, type Camera,
} from "three";
import { SUN_GLSL } from "./outdoor-lighting";
import { ImprovedNoise } from "three/addons/math/ImprovedNoise.js";

const skyVertex = `varying vec3 vDirection;
void main() { vDirection = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const skyFragment = `uniform float worldDimmer; varying vec3 vDirection;
void main() {
  vec3 direction = normalize(vDirection);
  vec3 horizon = vec3(.42, .69, .85);
  vec3 middle = vec3(.012, .21, .62);
  vec3 zenith = vec3(.009, .065, .25);
  vec3 sky = mix(horizon, middle, smoothstep(-.025, .16, direction.y));
  sky = mix(sky, zenith, smoothstep(.10, .62, direction.y));
  float sun = max(dot(direction, ${SUN_GLSL}), 0.0);
  sky += vec3(.28, .21, .10) * pow(sun, 12.0);
  sky += vec3(1.0, .85, .55) * smoothstep(.9993, .9998, sun);
  gl_FragColor = vec4(sky * worldDimmer, 1.0);
  #include <colorspace_fragment>
}`;

// A reusable density field, not a cloud picture. Green stores precomputed light
// transmittance, saving multiple shadow-ray samples at every raymarch step.
function cumulusField(variant: number) {
  const nx = 128, ny = 96, nz = 80, noise = new ImprovedNoise();
  const density = new Float32Array(nx * ny * nz);
  // Sculpted cumulus towers: narrow upward growth, low spreading bases and
  // smaller satellite billows. Variants avoid repeating one pancake silhouette.
  const lobes = variant === 0 ? [
    [-.27,-.23,0,.19,.12,.22],[-.05,-.21,0,.25,.15,.27],[.23,-.24,.01,.20,.12,.21],
    [-.16,-.06,.02,.22,.22,.24],[.10,-.04,-.04,.22,.20,.25],
    [-.10,.12,0,.18,.21,.21],[-.17,.27,-.01,.13,.14,.15],
    [.15,.10,.04,.14,.16,.16],[.30,-.11,.03,.12,.13,.16],
    [-.34,-.10,.02,.11,.12,.16],[.01,.24,.01,.12,.13,.13],
  ] : [
    [-.29,-.25,0,.16,.11,.22],[-.08,-.23,0,.24,.14,.25],[.18,-.23,.02,.23,.13,.24],
    [.12,-.04,0,.22,.23,.25],[.20,.14,.02,.17,.22,.19],
    [.12,.29,0,.12,.13,.14],[-.15,-.06,0,.18,.19,.23],
    [-.22,.08,.02,.13,.14,.17],[.33,-.08,.02,.10,.14,.15],
  ];
  const index = (x: number, y: number, z: number) => (z * ny + y) * nx + x;
  for (let z = 0; z < nz; z++) for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
    const px = x / (nx - 1) - .5, py = y / (ny - 1) - .5, pz = z / (nz - 1) - .5;
    if (variant === 2) {
      // Wind-stretched, broken filaments rather than a flattened cumulus blob.
      const envelope=Math.max(0,1-Math.pow(px/.47,4))*Math.max(0,1-Math.pow(pz/.42,4));
      const fibre=noise.noise(px*5+41,py*9,pz*19)+.35*noise.noise(px*14,py*17,pz*37);
      density[index(x,y,z)]=Math.max(0,Math.min(1,(fibre-.02)*2))*envelope*Math.exp(-py*py*28);
      continue;
    }
    let shape = -1;
    for (const [cx,cy,cz,rx,ry,rz] of lobes) {
      shape = Math.max(shape, 1 - Math.hypot((px-cx)/rx, (py-cy)/ry, (pz-cz)/rz));
    }
    const detail = noise.noise(px*11+13+variant*31,py*11+5,pz*11)*.19
      + noise.noise(px*27+variant*17,py*27,pz*27)*.065
      + noise.noise(px*57,py*57,pz*57)*.018;
    density[index(x,y,z)] = Math.max(0, Math.min(1, (shape + detail) * 7.0)) * Math.min(1, Math.max(0, (py+.37)*22));
  }
  const data = new Uint8Array(nx * ny * nz * 4);
  for (let z = 0; z < nz; z++) for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
    const i = index(x,y,z); let opticalDepth = 0;
    for (let step = 1; step <= 8; step++) {
      const xx = x-step*2, yy = y+step*3, zz = z+step;
      if (xx >= 0 && yy < ny && zz < nz) opticalDepth += density[index(xx,yy,zz)] * .38;
    }
    data[i*4] = density[i] * 255;
    data[i*4+1] = Math.exp(-opticalDepth) * 255;
    data[i*4+2] = y / ny * 255;
    data[i*4+3] = 255;
  }
  const texture = new Data3DTexture(data, nx, ny, nz);
  texture.format = RGBAFormat; texture.minFilter = texture.magFilter = LinearFilter;
  texture.unpackAlignment = 1; texture.needsUpdate = true;
  return texture;
}
const cloudVertex = `varying vec3 vOrigin; varying vec3 vDirection; varying float vCloudDistance;
void main() {
  vCloudDistance = length((modelMatrix * vec4(0.0,0.0,0.0,1.0)).xyz-cameraPosition);
  vOrigin = (inverse(modelMatrix) * vec4(cameraPosition, 1.0)).xyz;
  vDirection = position - vOrigin;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const cloudFragment = `precision highp sampler3D;
uniform sampler3D densityMap; uniform float worldDimmer; uniform float cloudExtinction;
uniform vec3 cloudShade; uniform vec3 cloudLight;
varying vec3 vOrigin; varying vec3 vDirection; varying float vCloudDistance;
void main() {
  vec3 ray = normalize(vDirection);
  vec3 invRay = 1.0 / ray;
  vec3 t0 = (vec3(-.5,-.4,-.42) - vOrigin) * invRay, t1 = (vec3(.5,.48,.42) - vOrigin) * invRay;
  vec3 nearT = min(t0,t1), farT = max(t0,t1);
  float enter = max(0.0, max(nearT.x, max(nearT.y, nearT.z)));
  float leave = min(farT.x, min(farT.y, farT.z));
  if (enter >= leave) discard;
  float stride = (leave-enter)/48.0;
  // Stable spatial dither prevents visible slices without temporal sparkling.
  float jitter = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(.06711056,.00583715))));
  vec3 p = vOrigin + ray * (enter + stride*jitter) + .5;
  vec4 accumulated = vec4(0.0);
  for (int i = 0; i < 48; i++) {
    vec3 field = texture(densityMap, p).rgb;
    float alpha = 1.0 - exp(-smoothstep(.10,.65,field.r) * stride * cloudExtinction);
    float illumination=field.g*.88+field.b*.12;
    float lit=smoothstep(.13,.42,illumination)*.55+smoothstep(.5,.8,illumination)*.45;
    vec3 light = mix(cloudShade, cloudLight, lit);
    light=mix(light,vec3(.45,.66,.84),smoothstep(680.0,980.0,vCloudDistance)*.18);
    accumulated.rgb += (1.0-accumulated.a) * alpha * light;
    accumulated.a += (1.0-accumulated.a) * alpha;
    if (accumulated.a > .985) break;
    p += ray * stride;
  }
  if (accumulated.a < .008) discard;
  gl_FragColor = vec4(accumulated.rgb / max(accumulated.a,.001) * worldDimmer, accumulated.a);
  #include <colorspace_fragment>
}`;

// Asymmetric cloud streets: towers beside landmarks, low banks at the
// horizon and small high wisps. The open blue centre preserves the vista.
const NEAR_CLOUD_COUNT=4;
const banks: {p:number[];s:number[];yaw:number;wisp?:boolean}[] = [
  { p: [-282,-18,-930], s: [245,70,150], yaw: .1 },
  { p: [-357,35,-960], s: [84,39,60], yaw: -.35 },
  { p: [590,-20,-1150], s: [195,48,105], yaw: -.2 },
  { p: [150,-2,-835], s: [75,24,54], yaw: .2 },
  { p: [-350,65,-740], s: [260,145,160], yaw: .18 },
  { p: [280,55,-770], s: [280,175,190], yaw: -.4 },
  { p: [720,39,-240], s: [185,125,150], yaw: -1.0 },
  { p: [550,46,570], s: [220,170,155], yaw: .9 },
  { p: [-270,42,740], s: [240,155,165], yaw: -.3 },
  { p: [-690,62,350], s: [220,200,170], yaw: 1.15 },
  { p: [-745,34,-180], s: [175,115,130], yaw: .8 },
  ...Array.from({length:16}, (_,i) => {
    const angle=(i+.27)/16*Math.PI*2;
    return {p:[Math.sin(angle)*860,45+(i%4)*9,Math.cos(angle)*860], s:[130+(i%3)*35,75+(i%4)*20,95],yaw:angle+.2};
  }),
  ...Array.from({length:8},(_,i)=>{
    const a=-1.1+i*.30;
    return {p:[Math.sin(a)*640,115+(i%3)*18,-Math.cos(a)*640],s:[60+(i%3)*15,30+(i%2)*10,35],yaw:a};
  }),
  ...Array.from({length:12}, (_,i) => {
    const angle=(i+.65)/12*Math.PI*2;
    return {p:[Math.sin(angle)*690,100+(i%3)*22,Math.cos(angle)*690],s:[70+(i%3)*18,14+(i%2)*8,38],yaw:angle-.6,wisp:true};
  }),
];

// Three's scene is an imperative external renderer resource, not React state.
function installSkyLighting(gl: WebGLRenderer, scene: Scene, backdrop: Scene, setDimmer: (ratio: number) => void) {
  setDimmer(1);
  const previous = scene.environment, generator = new PMREMGenerator(gl);
  const target = generator.fromScene(backdrop, .04, .1, 1200, { position: new Vector3() });
  scene.environment = target.texture; setDimmer(scene.userData.worldDimmer ?? 1);
  generator.dispose();
  return () => { if (scene.environment === target.texture) scene.environment = previous; target.dispose(); };
}

function renderSkyBackdrop(renderer: WebGLRenderer, scene: Scene, camera: Camera, target: WebGLRenderTarget) {
  const previousTarget = renderer.getRenderTarget(), previousClear = renderer.autoClear;
  try {
    renderer.autoClear = true; renderer.setRenderTarget(target); renderer.render(scene,camera);
  } finally { renderer.setRenderTarget(previousTarget); renderer.autoClear = previousClear; }
}

export function Atmosphere({ active }: { active: boolean }) {
  const gl = useThree(s => s.gl);
  const scene = useThree(s => s.scene);
  const size = useThree(s => s.size);
  const dpr = useThree(s => s.viewport.dpr);
  const elapsed = useRef(0);
  const { dome, sky, cloud, cloudVariant, wisps, volume, field, fieldVariant, wispField, setDimmer, backdrop, target, screen, composite, updateClouds } = useMemo(() => {
    const dimmer = { value: 1 }, field = cumulusField(0);
    const sky = new ShaderMaterial({ vertexShader: skyVertex, fragmentShader: skyFragment,
      uniforms: { worldDimmer: dimmer }, side: BackSide, depthWrite: false, toneMapped: false });
    const cloud = new ShaderMaterial({ vertexShader: cloudVertex, fragmentShader: cloudFragment,
      uniforms: { worldDimmer: dimmer, densityMap: { value: field }, cloudExtinction: { value: 40 },
        cloudShade: { value: new Color("#a0bce8") }, cloudLight: { value: new Color("#fffdf5") } },
      side: BackSide, transparent: true, depthWrite: false, toneMapped: false });
    const fieldVariant = cumulusField(1), cloudVariant = cloud.clone();
    cloudVariant.uniforms.densityMap.value = fieldVariant;
    cloudVariant.uniforms.worldDimmer = dimmer;
    const wispField=cumulusField(2),wisps=cloud.clone();
    wisps.uniforms.densityMap.value=wispField;wisps.uniforms.cloudExtinction.value=18;
    wisps.uniforms.worldDimmer=dimmer;wisps.uniforms.cloudShade.value=new Color('#d4e3f5');
    const setDimmer = (ratio: number) => { dimmer.value = ratio; };
    sky.userData.setWorldDimmer = cloud.userData.setWorldDimmer = cloudVariant.userData.setWorldDimmer = wisps.userData.setWorldDimmer = setDimmer;
    const volume = new BoxGeometry(1,.88,.84).translate(0,.04,0), dome = new SphereGeometry(950,32,16);
    const backdrop = new Scene(), domeMesh = new Mesh(dome,sky); domeMesh.renderOrder=-10; backdrop.add(domeMesh);
    const distantClouds = banks.slice(NEAR_CLOUD_COUNT).map(({p,s,yaw,wisp},i) => {
      const mesh=new Mesh(volume,wisp?wisps:i%2?cloudVariant:cloud);mesh.position.fromArray(p);mesh.scale.fromArray(s);mesh.rotation.y=yaw;
      backdrop.add(mesh);return mesh;
    });
    // Three-quarter resolution preserves the small sculpted cloud edges.
    // This contains only distant atmosphere; opaque scenery still renders at
    // native canvas resolution over it. Near landmark clouds retain real depth.
    const target = new WebGLRenderTarget(1,1,{type:HalfFloatType,depthBuffer:false});
    const composite = new ShaderMaterial({
      uniforms:{skyTexture:{value:target.texture}}, depthTest:false, depthWrite:false, toneMapped:false,
      vertexShader:`varying vec2 vSkyUv;void main(){vSkyUv=uv;gl_Position=vec4(position.xy,1.0,1.0);}`,
      fragmentShader:`uniform sampler2D skyTexture;varying vec2 vSkyUv;
        void main(){gl_FragColor=texture2D(skyTexture,vSkyUv);
        #include <colorspace_fragment>
        }`,
    });
    composite.userData.setWorldDimmer=setDimmer;
    return {dome,sky,cloud,cloudVariant,wisps,volume,field,fieldVariant,wispField,setDimmer,backdrop,target,screen:new PlaneGeometry(2,2),composite,
      updateClouds:(time:number)=>distantClouds.forEach((mesh,i)=>{mesh.position.x=banks[i+NEAR_CLOUD_COUNT].p[0]+Math.sin(time*.008+i+2)*7;})};
  }, []);
  useEffect(() => installSkyLighting(gl, scene, backdrop, setDimmer), [gl, scene, backdrop, setDimmer]);
  useEffect(() => { target.setSize(Math.max(1,Math.ceil(size.width*dpr*.75)),Math.max(1,Math.ceil(size.height*dpr*.75))); }, [target,size.width,size.height,dpr]);
  const cloudRefs = useRef<(Mesh | null)[]>([]);
  const skyCache=useRef({world:new Matrix4(),projection:new Matrix4(),width:0,height:0,age:Infinity,dimmer:NaN});
  const matrixChanged=(a:Matrix4,b:Matrix4)=>a.elements.some((value,i)=>Math.abs(value-b.elements[i])>1e-7);
  useFrame(({camera},delta) => {
    if (active) {
      elapsed.current += Math.min(delta,.1); updateClouds(elapsed.current);
      cloudRefs.current.forEach((mesh,i) => { if (mesh) mesh.position.x = banks[i].p[0] + Math.sin(elapsed.current*.008+i)*1.2; });
    }
    // Cloud drift is subpixel over several frames at this distance. Reuse the
    // rendered atmosphere while seated; every camera/projection/size/dimmer
    // change renders immediately. Near volumes always retain full-rate depth.
    camera.updateMatrixWorld();
    const cache=skyCache.current;
    cache.age+=delta;
    const dimmer=scene.userData.worldDimmer??1;
    if(matrixChanged(camera.matrixWorld,cache.world)||matrixChanged(camera.projectionMatrix,cache.projection)
      ||target.width!==cache.width||target.height!==cache.height||dimmer!==cache.dimmer
      ||(active&&cache.age>=1/12)){
      renderSkyBackdrop(gl,backdrop,camera,target);
      cache.world.copy(camera.matrixWorld);cache.projection.copy(camera.projectionMatrix);
      cache.width=target.width;cache.height=target.height;cache.dimmer=dimmer;cache.age=0;
    }
  });
  useEffect(() => () => {
    dome.dispose();sky.dispose();cloud.dispose();cloudVariant.dispose();wisps.dispose();wispField.dispose();fieldVariant.dispose();volume.dispose();field.dispose();target.dispose();screen.dispose();composite.dispose();
  }, [dome,sky,cloud,cloudVariant,wisps,volume,field,fieldVariant,wispField,target,screen,composite]);
  return <group name="procedural-atmosphere">
    <mesh geometry={screen} material={composite} renderOrder={-10} frustumCulled={false} raycast={() => {}} />
    {banks.slice(0,NEAR_CLOUD_COUNT).map(({p,s,yaw},i) => <mesh key={i} ref={mesh => { cloudRefs.current[i] = mesh; }}
      geometry={volume} material={cloud} position={p as [number,number,number]} scale={s as [number,number,number]}
      rotation={[0,yaw,0]} raycast={() => {}} />)}
  </group>;
}
