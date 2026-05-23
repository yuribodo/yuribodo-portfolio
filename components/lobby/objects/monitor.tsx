"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import gsap from "gsap";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Box3, Color, MeshStandardMaterial, Vector3 } from "three";
import type { ThreeEvent } from "@react-three/fiber";
import type {
  Mesh,
  MeshStandardMaterial as MeshStandardMaterialType,
  Object3D,
} from "three";
import type { PointerEvent as ReactPointerEvent } from "react";

import { useHoldActivate } from "@/hooks/use-hold-activate";

const MONITOR_MODEL_PATH = "/lobby/models/monitor.glb";
// Annelida MateView exports at ~0.72m wide including the stand foot. At the
// seated POV (#5), 0.62m read too imposing relative to the hutch opening, so
// we ease back to 0.54m — still believable as a 24-27" panel, but framed by
// the hutch rather than crowding it.
const MONITOR_TARGET_WIDTH = 0.54;
// The seanb desk model has a raised monitor riser at the back of the writing
// surface (SmallSupportL1_MiniBoard_0). Its top sits at world y=-0.533 and it
// spans z ∈ [-0.405, -0.154] — exactly the shelf a real monitor would sit on.
// Both values probed empirically from the desk mesh; keep in sync if the
// desk's normalisation in desk.tsx ever changes.
const MONITOR_RISER_TOP_Y = -0.533;
const MONITOR_RISER_CENTER_Z = -0.28;
// Annelida's Screen_Display_0 mesh — a 4-vert quad with the Display material
// (emissiveTexture only). We swap the material at mount so the emissive map
// + intensity can be driven from React state (boot screen, pulse, transition).
const SCREEN_MESH_NAME = "Screen_Display_0";

// Power button: bottom-right of the front bezel, sitting just proud of the
// body face. Probed visually; nudge if the screen mesh ever moves. The body
// front face sits at world z ≈ -0.21 (centred on -0.28, depth 0.14m), the
// screen panel ends around y ≈ -0.31, and the bezel strip + stand neck sits
// below it. We place the LED on that strip, inset from the right edge.
const BUTTON_POSITION: [number, number, number] = [0.21, -0.335, -0.17];
// ≥ 0.030 keeps the raycast collider above 24px at the seated POV (camera
// distance ~2.4m, FOV 50°). Visually small but reliably clickable.
const BUTTON_RADIUS = 0.022;

// LED intensities — multiply the emissive red base colour.
const LED_IDLE_INTENSITY = 0.7;
const LED_HOVER_INTENSITY = 1.6;
const LED_PRESSED_INTENSITY = 4.0;
const IDLE_PULSE_PERIOD_S = 2.5;
const HOVER_PULSE_PERIOD_S = 1.0;
const CANCEL_EASE_DURATION_S = 0.3;

// Screen flash + scanline on hold complete.
const SCREEN_FLASH_INTENSITY = 6;
const SCREEN_FLASH_RISE_S = 0.06;
const SCREEN_FLASH_FALL_S = 0.3;

useGLTF.preload(MONITOR_MODEL_PATH);

export default function Monitor() {
  const { scene } = useGLTF(MONITOR_MODEL_PATH);
  const screenMaterialRef = useRef<MeshStandardMaterialType | null>(null);
  const ledMaterialRef = useRef<MeshStandardMaterialType>(null);
  // Decoupled from React state — useFrame reads/writes this every frame; the
  // GSAP cancel tween animates it without a re-render storm.
  const pressedIntensityRef = useRef(0);
  const cancelTweenRef = useRef<gsap.core.Tween | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  // NOTE: this useHoldActivate instance drives only the monitor's local
  // visuals (LED state + screen flash). Issue #6's instance in desk-scene.tsx
  // still owns the lobby state machine. They are lifted into a single source
  // of truth in the next commit (#7 task 6).
  const { bind, isHolding } = useHoldActivate({
    onStart: () => {
      cancelTweenRef.current?.kill();
      pressedIntensityRef.current = LED_PRESSED_INTENSITY;
    },
    onCancel: () => {
      cancelTweenRef.current = gsap.to(pressedIntensityRef, {
        current: 0,
        duration: CANCEL_EASE_DURATION_S,
        ease: "power3.out",
      });
    },
    onComplete: () => {
      cancelTweenRef.current?.kill();
      pressedIntensityRef.current = LED_PRESSED_INTENSITY;
      const screen = screenMaterialRef.current;
      if (!screen) return;
      gsap
        .timeline()
        .to(screen, {
          emissiveIntensity: SCREEN_FLASH_INTENSITY,
          duration: SCREEN_FLASH_RISE_S,
          ease: "none",
        })
        .to(screen, {
          emissiveIntensity: 0,
          duration: SCREEN_FLASH_FALL_S,
          ease: "power2.out",
        });
    },
  });

  useLayoutEffect(() => {
    scene.scale.setScalar(1);
    scene.position.set(0, 0, 0);
    scene.rotation.set(0, 0, 0);

    // Measure in local space, no parent transform interference.
    const rawBox = new Box3().setFromObject(scene);
    const rawSize = new Vector3();
    rawBox.getSize(rawSize);

    const scale = MONITOR_TARGET_WIDTH / rawSize.x;
    scene.scale.setScalar(scale);

    // Re-measure post-scale and place the model so its base sits on the
    // riser top, centred on x, nudged back on z.
    const finalBox = new Box3().setFromObject(scene);
    const finalCentre = new Vector3();
    finalBox.getCenter(finalCentre);
    scene.position.set(
      -finalCentre.x,
      MONITOR_RISER_TOP_Y - finalBox.min.y,
      MONITOR_RISER_CENTER_Z - finalCentre.z,
    );

    scene.traverse((obj: Object3D) => {
      const mesh = obj as Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      if (mesh.name === SCREEN_MESH_NAME) {
        // The shipped Display material is a static emissive image. Swap it
        // for a controllable MeshStandardMaterial so the rest of the system
        // (boot glyphs in #7, pulse/states in #5, dive in #10) can mutate
        // emissiveMap + emissiveIntensity without re-cloning per frame.
        const screenMaterial = new MeshStandardMaterial({
          color: new Color("#000000"),
          emissive: new Color("#ffffff"),
          emissiveIntensity: 0,
          roughness: 0.25,
          metalness: 0,
          // The boot-glyphs texture lands in #7; until then the screen reads
          // as a powered-off black panel.
          emissiveMap: null,
        });
        mesh.material = screenMaterial;
        screenMaterialRef.current = screenMaterial;
      }
    });

    return () => {
      screenMaterialRef.current?.dispose();
      screenMaterialRef.current = null;
    };
  }, [scene]);

  // Cursor pointer while hovering the power button.
  useEffect(() => {
    if (!isHovered) return;
    const previous = document.body.style.cursor;
    document.body.style.cursor = "pointer";
    return () => {
      document.body.style.cursor = previous;
    };
  }, [isHovered]);

  useFrame(({ clock }) => {
    const led = ledMaterialRef.current;
    if (!led) return;
    const t = clock.elapsedTime;

    // Pressed / cancelling: pressedIntensityRef holds the instantaneous value
    // (set by onStart, eased back to 0 by GSAP on cancel/after complete fade).
    if (isHolding || pressedIntensityRef.current > 0.01) {
      led.emissiveIntensity = pressedIntensityRef.current;
      return;
    }

    if (isHovered) {
      const pulse = 0.5 + 0.5 * Math.sin((t / HOVER_PULSE_PERIOD_S) * Math.PI * 2);
      led.emissiveIntensity = LED_HOVER_INTENSITY * (0.6 + 0.4 * pulse);
      return;
    }

    const pulse = 0.5 + 0.5 * Math.sin((t / IDLE_PULSE_PERIOD_S) * Math.PI * 2);
    led.emissiveIntensity = LED_IDLE_INTENSITY * (0.6 + 0.4 * pulse);
  });

  const handlePointerEnter = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setIsHovered(true);
  };
  const handlePointerLeave = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setIsHovered(false);
    bind.onPointerLeave(e as unknown as ReactPointerEvent<Element>);
  };
  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    bind.onPointerDown(e as unknown as ReactPointerEvent<Element>);
  };
  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    bind.onPointerUp(e as unknown as ReactPointerEvent<Element>);
  };

  return (
    <>
      <primitive object={scene} />
      <mesh
        position={BUTTON_POSITION}
        onPointerOver={handlePointerEnter}
        onPointerOut={handlePointerLeave}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      >
        <sphereGeometry args={[BUTTON_RADIUS, 16, 16]} />
        <meshStandardMaterial
          ref={ledMaterialRef}
          color="#1a0000"
          emissive="#ff2222"
          emissiveIntensity={LED_IDLE_INTENSITY}
          roughness={0.4}
          metalness={0}
        />
      </mesh>
    </>
  );
}
