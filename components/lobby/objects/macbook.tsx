"use client";

import { useGLTF } from "@react-three/drei";
import gsap from "gsap";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Box3, Vector3 } from "three";
import type { ThreeEvent } from "@react-three/fiber";
import type {
  Group,
  Mesh,
  MeshStandardMaterial as MeshStandardMaterialType,
  Object3D,
} from "three";

import { LOBBY_MODELS } from "@/lib/lobby/assets";

// Spec §3 target placement. The MacBook sits to the left of the keyboard,
// slightly back, gently rotated off-axis so the desk reads as lived-in
// rather than photoshoot-staged. Y is the world top of the desk writing
// surface (TableTop_DeskBoards_0 max.y after the desk's scale + recentre).
// Probed once via a temporary console log in desk.tsx; mirrors the same
// pattern the monitor uses for its riser top.
const DESK_TOP_Y = -0.602;
const MACBOOK_POSITION: [number, number, number] = [-0.5, DESK_TOP_Y, -0.1];
const MACBOOK_Y_ROTATION = (5 * Math.PI) / 180; // ~5° off-axis

// Real MacBook 13" closed: ~31cm wide. The NoXiou5 model is a fused mesh
// (lid + base + apple logo baked into one primitive — see issue #9 thread)
// so this is the only size knob we have. 0.30m reads as a 13" laptop at
// the seated POV without crowding the keyboard or the figures group.
const MACBOOK_TARGET_WIDTH = 0.3;

// Apple-logo emissive levels. The NoXiou5 emissiveTexture is mostly black
// with the logo as the only bright zone, so modulating emissiveIntensity
// on the whole material is effectively a logo-only dimmer.
const EMISSIVE_IDLE = 0.15;
const EMISSIVE_HOVER = 0.45;
const EMISSIVE_FLASH = 2.5;

// Click response — a brief "the dev's laptop blinks awake" beat. Replaces
// the lid-open animation the spec originally called for; pivoted in #9
// after confirming the model can't be split without Blender work.
const BOUNCE_HEIGHT = 0.015;
const FLASH_RISE_S = 0.2;
const FLASH_FALL_S = 0.4;

const HOVER_LIFT = 0.015;
const HOVER_DURATION_S = 0.2;

type ClickState = "idle" | "flashing";

export default function Macbook() {
  const { scene } = useGLTF(LOBBY_MODELS.macbook);
  const groupRef = useRef<Group>(null);
  const materialRef = useRef<MeshStandardMaterialType | null>(null);
  const clickStateRef = useRef<ClickState>("idle");
  const flashTweenRef = useRef<gsap.core.Timeline | null>(null);
  const hoverTweenRef = useRef<gsap.core.Tween | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  useLayoutEffect(() => {
    // Measure in a detached clone so Box3.setFromObject returns a true LOCAL
    // bbox. Measuring the actual scene mid-mount returns a WORLD bbox that
    // already bakes in the group's prop-driven position+rotation — which then
    // double-applies when we set scene.position. clone(true) is cheap
    // (geometry/material refs are shared) and runs once per mount.
    const probe = scene.clone(true);
    probe.scale.setScalar(1);
    probe.position.set(0, 0, 0);
    probe.rotation.set(0, 0, 0);

    const rawBox = new Box3().setFromObject(probe);
    const rawSize = new Vector3();
    rawBox.getSize(rawSize);

    const scale = MACBOOK_TARGET_WIDTH / rawSize.x;
    probe.scale.setScalar(scale);

    const finalBox = new Box3().setFromObject(probe);
    const finalCentre = new Vector3();
    finalBox.getCenter(finalCentre);

    // Apply scale + centring to the actual mounted scene. Centre x/z on the
    // group origin; rest the MacBook base on group-local y=0 so the wrapper's
    // position prop places it directly on the desk surface.
    scene.scale.setScalar(scale);
    scene.position.set(-finalCentre.x, -finalBox.min.y, -finalCentre.z);
    scene.rotation.set(0, 0, 0);

    scene.traverse((obj: Object3D) => {
      const mesh = obj as Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      const material = mesh.material as MeshStandardMaterialType;
      if (!material) return;
      // Sketchfab exports this material with alphaMode=BLEND and doubleSided
      // — neither is correct for an opaque MacBook shell, and both cost
      // draw-call performance. Force opaque single-sided.
      material.transparent = false;
      material.depthWrite = true;
      material.side = 0; // FrontSide
      material.emissiveIntensity = EMISSIVE_IDLE;
      materialRef.current = material;
    });
  }, [scene]);

  // Cursor pointer while hovering.
  useEffect(() => {
    if (!isHovered) return;
    const previous = document.body.style.cursor;
    document.body.style.cursor = "pointer";
    return () => {
      document.body.style.cursor = previous;
    };
  }, [isHovered]);

  // Hover lift + emissive bump. Tween targets the group transform and the
  // material emissive, so the flash timeline (which writes to the same
  // properties) needs to win — we kill the hover tween whenever a flash
  // starts. On flash complete we re-settle to the current hover state.
  // The lift is layered on top of DESK_TOP_Y rather than animated to 0
  // — otherwise the MacBook would jump to world origin on first render.
  useEffect(() => {
    const group = groupRef.current;
    const material = materialRef.current;
    if (!group || !material) return;
    if (clickStateRef.current === "flashing") return;

    hoverTweenRef.current?.kill();
    hoverTweenRef.current = gsap.to(group.position, {
      y: DESK_TOP_Y + (isHovered ? HOVER_LIFT : 0),
      duration: HOVER_DURATION_S,
      ease: "power2.out",
    });
    gsap.to(material, {
      emissiveIntensity: isHovered ? EMISSIVE_HOVER : EMISSIVE_IDLE,
      duration: HOVER_DURATION_S,
      ease: "power2.out",
    });
  }, [isHovered]);

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setIsHovered(true);
  };
  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setIsHovered(false);
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const group = groupRef.current;
    const material = materialRef.current;
    if (!group || !material) return;
    // Debounce — a click mid-flash is a no-op, no queue. Queued double-fires
    // produced a strobe under fast clicking in testing.
    if (clickStateRef.current !== "idle") return;

    clickStateRef.current = "flashing";
    hoverTweenRef.current?.kill();
    flashTweenRef.current?.kill();

    const liftedY = DESK_TOP_Y + (isHovered ? HOVER_LIFT : 0);
    const settleEmissive = isHovered ? EMISSIVE_HOVER : EMISSIVE_IDLE;

    flashTweenRef.current = gsap
      .timeline({
        onComplete: () => {
          clickStateRef.current = "idle";
        },
      })
      .to(material, {
        emissiveIntensity: EMISSIVE_FLASH,
        duration: FLASH_RISE_S,
        ease: "power2.in",
      }, 0)
      .to(group.position, {
        y: liftedY + BOUNCE_HEIGHT,
        duration: FLASH_RISE_S,
        ease: "power2.out",
      }, 0)
      .to(material, {
        emissiveIntensity: settleEmissive,
        duration: FLASH_FALL_S,
        ease: "power2.out",
      })
      .to(group.position, {
        y: liftedY,
        duration: FLASH_FALL_S,
        ease: "power2.out",
      }, "<");
  };

  useEffect(() => {
    return () => {
      flashTweenRef.current?.kill();
      hoverTweenRef.current?.kill();
    };
  }, []);

  return (
    <group
      ref={groupRef}
      position={MACBOOK_POSITION}
      rotation={[0, MACBOOK_Y_ROTATION, 0]}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    >
      <primitive object={scene} />
    </group>
  );
}
