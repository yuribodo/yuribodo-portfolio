import { Color, MeshStandardMaterial, type Texture } from "three";

/** Shared, low-contrast mineral finish for the terrace and its architecture.
 * World coordinates keep pigment continuous across separate masonry blocks.
 * Lighting, real shadows and the entry dimmer remain Three's standard path.
 */
export function paintedStone(color: string, pigment?: Texture) {
  const material = new MeshStandardMaterial({
    color, roughness: 1, metalness: 0, vertexColors: true, envMapIntensity: 0.12,
    emissive: new Color("#536879"), emissiveIntensity: 0.045,
  });
  material.userData.worldEmissive = material.emissiveIntensity;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.stonePigment = { value: pigment };
    shader.vertexShader = "varying vec3 vStonePosition; varying vec3 vStoneNormal;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", `
      #include <begin_vertex>
      vStonePosition = (modelMatrix * vec4(position, 1.0)).xyz;
      vStoneNormal = normalize(mat3(modelMatrix) * normal);
    `);
    shader.fragmentShader = "varying vec3 vStonePosition; varying vec3 vStoneNormal; uniform sampler2D stonePigment;\n" + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace("#include <color_fragment>", `
      #include <color_fragment>
      vec3 p = vStonePosition;
      float wash = sin(p.x * 3.4 + sin(p.z * 2.1)) * sin(p.z * 4.2 + p.y * 3.0);
      float grain = sin(p.x * 83.0 + p.z * 31.0) * sin(p.z * 71.0 + p.y * 59.0);
      diffuseColor.rgb *= 0.96 + 0.035 * wash + 0.008 * grain;
      ${pigment ? `
      vec3 blend = pow(abs(vStoneNormal), vec3(4.0));
      blend /= max(dot(blend, vec3(1.0)), 0.001);
      vec3 mineral = texture2D(stonePigment, p.yz * 0.65).rgb * blend.x
        + texture2D(stonePigment, p.xz * 0.65).rgb * blend.y
        + texture2D(stonePigment, p.xy * 0.65).rgb * blend.z;
      float value = dot(mineral, vec3(0.2126, 0.7152, 0.0722));
      diffuseColor.rgb *= 0.55 + value * 0.9;
      ` : ""}
    `);
  };
  material.customProgramCacheKey = () => `skybound-mineral-wash-v2-${!!pigment}`;
  return material;
}
