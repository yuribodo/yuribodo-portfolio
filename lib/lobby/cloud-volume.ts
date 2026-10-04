import { ImprovedNoise } from "three/addons/math/ImprovedNoise.js";

// A reusable density field, not a cloud picture. Green stores precomputed light
// transmittance, saving multiple shadow-ray samples at every raymarch step.
export function cumulusField(variant: number) {
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
  return data;
}
