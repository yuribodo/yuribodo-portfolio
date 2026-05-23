"use client";

import { useGLTF } from "@react-three/drei";
import gsap from "gsap";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Box3, Vector3 } from "three";
import type { ThreeEvent } from "@react-three/fiber";
import type {
  Group,
  Mesh,
  MeshStandardMaterial as MeshStandardMaterialType,
  Object3D,
  WebGLProgramParametersWithUniforms,
} from "three";

import { useObjectHover } from "@/hooks/use-object-hover";
import { LOBBY_MODELS } from "@/lib/lobby/assets";

// Mieshu's BlackWidow Chroma exports at ~7.5m wide in raw model space. A real
// BlackWidow Chroma TKL is ~36cm; sizing the model at 0.36m keeps it from
// colliding with the mousepad (assembly at x=+0.20, pad ~0.30m wide, so the
// pad's left edge sits at x≈+0.05). The previous 0.42m clipped into the pad.
const KEYBOARD_TARGET_WIDTH = 0.36;

// Hover lift — matches spec §5 "lift ~0.05u".
const HOVER_LIFT_Y = 0.05;
const HOVER_LIFT_DURATION_S = 0.25;

// Wave timing per spec: 800ms left→right per click. The uWavePos parameter
// ranges 0..1 across the keyboard's local x, with overshoot on both sides so
// the band enters and exits cleanly.
const WAVE_DURATION_S = 0.8;
const WAVE_START = -0.15;
const WAVE_END = 1.15;
// Width of the highlight band in normalized x. 0.18 ≈ 5-6 keycap widths.
const WAVE_BAND_WIDTH = 0.18;
// Peak emissive contribution under the band. 1.4 reads as a bright Chroma
// sweep under the desk lighting without clipping past the fog.
const WAVE_INTENSITY_PEAK = 1.4;
// Hover baseline — soft per-key rainbow visible across the whole board.
const HOVER_GLOW_PEAK = 0.18;
const HOVER_GLOW_DURATION_S = 0.2;

// Hook names for our injected shader chunk — keep them prefixed so they
// can't collide with future Three.js renames.
const VARYING_DECL = "varying float vRazerNormX;";
const UNIFORM_DECL = `
uniform float uRazerWavePos;
uniform float uRazerWaveWidth;
uniform float uRazerWaveIntensity;
uniform float uRazerHoverGlow;
uniform float uRazerMinX;
uniform float uRazerMaxX;
`;

const HSV_HELPER = `
vec3 razerHsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}
`;

interface WaveUniforms {
  uRazerWavePos: { value: number };
  uRazerWaveWidth: { value: number };
  uRazerWaveIntensity: { value: number };
  uRazerHoverGlow: { value: number };
  uRazerMinX: { value: number };
  uRazerMaxX: { value: number };
}

export interface KeyboardProps {
  position?: [number, number, number];
}

export default function Keyboard({ position = [0, 0, 0] }: KeyboardProps) {
  const { scene } = useGLTF(LOBBY_MODELS.keyboard);
  const groupRef = useRef<Group>(null);
  const liftTweenRef = useRef<gsap.core.Tween | null>(null);
  const waveTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const hoverGlowTweenRef = useRef<gsap.core.Tween | null>(null);
  const [isWaving, setIsWaving] = useState(false);

  // One uniforms instance shared across every shader-patched material on this
  // model. Three.js' onBeforeCompile fires once per material/program build —
  // we wire each program's uniforms map to point at the same objects so a
  // single GSAP tween drives them all.
  const uniforms = useMemo<WaveUniforms>(
    () => ({
      uRazerWavePos: { value: WAVE_START },
      uRazerWaveWidth: { value: WAVE_BAND_WIDTH },
      uRazerWaveIntensity: { value: 0 },
      uRazerHoverGlow: { value: 0 },
      uRazerMinX: { value: -1 },
      uRazerMaxX: { value: 1 },
    }),
    [],
  );

  const { isHovered, bind: hoverBind } = useObjectHover();

  useLayoutEffect(() => {
    // Measure in a detached clone so Box3.setFromObject returns a true
    // LOCAL bbox. Measuring the actual scene mid-mount returns a WORLD bbox
    // that already bakes in the group's prop-driven position+rotation —
    // which then double-applies when we set scene.position. clone(true) is
    // cheap (geometry/material refs are shared, only Object3D wrappers
    // duplicate) and runs once per mount.
    const probe = scene.clone(true);
    probe.scale.setScalar(1);
    probe.position.set(0, 0, 0);
    probe.rotation.set(0, 0, 0);

    const rawBox = new Box3().setFromObject(probe);
    const rawSize = new Vector3();
    rawBox.getSize(rawSize);
    uniforms.uRazerMinX.value = rawBox.min.x;
    uniforms.uRazerMaxX.value = rawBox.max.x;

    const scale = KEYBOARD_TARGET_WIDTH / rawSize.x;
    probe.scale.setScalar(scale);

    const finalBox = new Box3().setFromObject(probe);
    const finalCentre = new Vector3();
    finalBox.getCenter(finalCentre);

    // Apply scale + centring to the actual scene (mounted in the group).
    // Centre x/z on origin; rest the keyboard base on group-local y=0 so the
    // wrapper's position prop places it directly on the desk surface.
    scene.scale.setScalar(scale);
    scene.position.set(-finalCentre.x, -finalBox.min.y, -finalCentre.z);
    scene.rotation.set(0, 0, 0);

    scene.traverse((obj: Object3D) => {
      const mesh = obj as Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      // Mieshu's BlackWidow ships as one material with baseColor + normal +
      // metallicRoughness + occlusion + a baked Chroma emissive. We clone
      // the material so onBeforeCompile patches affect only this instance.
      const original = mesh.material as MeshStandardMaterialType;
      const patched = original.clone();
      // The standard emissive_fragment chunk multiplies totalEmissiveRadiance
      // (= emissive uniform) by the emissive map. If the uniform is black —
      // which is the GLTF default unless the exporter sets emissiveFactor —
      // the multiplication zeros the baked Chroma map. Force a white uniform
      // + unit intensity so the baked keycap colours render at full strength
      // before our wave/hover contribution adds on top.
      patched.emissive.setRGB(1, 1, 1);
      patched.emissiveIntensity = 1;
      patched.onBeforeCompile = (
        shader: WebGLProgramParametersWithUniforms,
      ) => {
        // Wire our uniforms into the program's uniform map. The values are
        // shared refs — GSAP mutates them directly each frame, no per-frame
        // setUniform calls needed.
        shader.uniforms.uRazerWavePos = uniforms.uRazerWavePos;
        shader.uniforms.uRazerWaveWidth = uniforms.uRazerWaveWidth;
        shader.uniforms.uRazerWaveIntensity = uniforms.uRazerWaveIntensity;
        shader.uniforms.uRazerHoverGlow = uniforms.uRazerHoverGlow;
        shader.uniforms.uRazerMinX = uniforms.uRazerMinX;
        shader.uniforms.uRazerMaxX = uniforms.uRazerMaxX;

        shader.vertexShader = shader.vertexShader
          .replace(
            "#include <common>",
            `#include <common>\n${VARYING_DECL}\nuniform float uRazerMinX;\nuniform float uRazerMaxX;`,
          )
          .replace(
            "#include <begin_vertex>",
            `#include <begin_vertex>\nvRazerNormX = (position.x - uRazerMinX) / max(uRazerMaxX - uRazerMinX, 0.0001);`,
          );

        shader.fragmentShader = shader.fragmentShader
          .replace(
            "#include <common>",
            `#include <common>\n${VARYING_DECL}\n${UNIFORM_DECL}\n${HSV_HELPER}`,
          )
          .replace(
            "#include <emissivemap_fragment>",
            `#include <emissivemap_fragment>
            {
              float dist = abs(vRazerNormX - uRazerWavePos);
              float highlight = smoothstep(uRazerWaveWidth, 0.0, dist);
              vec3 hueAtPos = razerHsv2rgb(vec3(vRazerNormX, 1.0, 1.0));
              float extra = highlight * uRazerWaveIntensity + uRazerHoverGlow;
              totalEmissiveRadiance += hueAtPos * extra;
            }`,
          );
      };
      // Required when onBeforeCompile injects new uniforms — Three caches
      // programs by material reference + onBeforeCompile identity.
      patched.customProgramCacheKey = () => "razer-keyboard-wave";
      mesh.material = patched;
    });

    return () => {
      scene.traverse((obj: Object3D) => {
        const mesh = obj as Mesh;
        if (!mesh.isMesh) return;
        (mesh.material as MeshStandardMaterialType).dispose();
      });
    };
  }, [scene, uniforms]);

  // Hover → emissive baseline glow + 0.05u lift. Both interruptible.
  useEffect(() => {
    hoverGlowTweenRef.current?.kill();
    hoverGlowTweenRef.current = gsap.to(uniforms.uRazerHoverGlow, {
      value: isHovered ? HOVER_GLOW_PEAK : 0,
      duration: HOVER_GLOW_DURATION_S,
      ease: "power2.out",
    });

    liftTweenRef.current?.kill();
    if (groupRef.current) {
      const baseY = position[1] ?? 0;
      liftTweenRef.current = gsap.to(groupRef.current.position, {
        y: baseY + (isHovered ? HOVER_LIFT_Y : 0),
        duration: HOVER_LIFT_DURATION_S,
        ease: "power3.out",
      });
    }
  }, [isHovered, uniforms, position]);

  useEffect(() => {
    return () => {
      liftTweenRef.current?.kill();
      waveTimelineRef.current?.kill();
      hoverGlowTweenRef.current?.kill();
    };
  }, []);

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    if (isWaving) return;
    setIsWaving(true);
    waveTimelineRef.current?.kill();
    uniforms.uRazerWavePos.value = WAVE_START;
    uniforms.uRazerWaveIntensity.value = 0;
    waveTimelineRef.current = gsap
      .timeline({
        onComplete: () => {
          uniforms.uRazerWavePos.value = WAVE_START;
          uniforms.uRazerWaveIntensity.value = 0;
          setIsWaving(false);
        },
      })
      .to(uniforms.uRazerWaveIntensity, {
        value: WAVE_INTENSITY_PEAK,
        duration: 0.08,
        ease: "power2.out",
      })
      .to(
        uniforms.uRazerWavePos,
        {
          value: WAVE_END,
          duration: WAVE_DURATION_S,
          ease: "power2.inOut",
        },
        0,
      )
      .to(
        uniforms.uRazerWaveIntensity,
        {
          value: 0,
          duration: 0.18,
          ease: "power2.in",
        },
        WAVE_DURATION_S - 0.05,
      );
  };

  return (
    <group
      ref={groupRef}
      position={position}
      // Mieshu's GLB exports with the spacebar facing the monitor (+Z towards
      // the viewer in our seated POV is the number row). Flip 180° around Y
      // on the wrapping group so the spacebar/palm-rest faces the visitor —
      // rotating on the group instead of inside the scene keeps the model's
      // internal scale + base-y placement untouched.
      rotation={[0, Math.PI, 0]}
      onClick={handleClick}
      {...hoverBind}
    >
      <primitive object={scene} />
    </group>
  );
}
