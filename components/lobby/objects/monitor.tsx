"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import gsap from "gsap";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Box3,
  CanvasTexture,
  Color,
  LinearFilter,
  MeshStandardMaterial,
  SRGBColorSpace,
  Vector3,
} from "three";
import type { ThreeEvent } from "@react-three/fiber";
import type {
  Mesh,
  MeshStandardMaterial as MeshStandardMaterialType,
  Object3D,
} from "three";
import type { PointerEvent as ReactPointerEvent } from "react";

import type { HoldActivateBind } from "@/hooks/use-hold-activate";
import { LOBBY_MODELS } from "@/lib/lobby/assets";
import {
  BOOT_CANVAS_HEIGHT,
  BOOT_CANVAS_WIDTH,
  drawBootScreen,
} from "@/lib/lobby/boot-screen";
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

// Boot screen — emissive intensity once any glyph is visible. Higher values
// blow out under our dramatic key + rim lighting; 2.5 reads as a real CRT.
const SCREEN_ON_INTENSITY = 2.5;
// Cursor blink frequency on the typing line — 2.5Hz feels like a real CRT.
const CURSOR_BLINK_INTERVAL_MS = 400;

export interface MonitorProps {
  bind: HoldActivateBind;
  isHolding: boolean;
  /** External boot-screen reveal in [0, 1]. The dive transition (#10) animates
   *  this from 0 → 1; 0 keeps the screen black. */
  bootProgress?: number;
}

export interface MonitorHandle {
  /** Called by the parent's useHoldActivate.onComplete to play the press-complete
   *  visual: a brief white flash on the screen mesh. The scanline sweep lands in #7. */
  flashComplete: () => void;
  /** Called by the parent on cancel so the LED eases back to baseline. */
  cancelPress: () => void;
}

const Monitor = forwardRef<MonitorHandle, MonitorProps>(function Monitor(
  { bind, isHolding, bootProgress = 0 },
  ref,
) {
  const { scene } = useGLTF(LOBBY_MODELS.monitor);
  const screenMaterialRef = useRef<MeshStandardMaterialType | null>(null);
  const ledMaterialRef = useRef<MeshStandardMaterialType>(null);
  // Decoupled from React state — useFrame reads/writes this every frame; the
  // GSAP cancel tween animates it without a re-render storm.
  const pressedIntensityRef = useRef(0);
  const cancelTweenRef = useRef<gsap.core.Tween | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Lazily allocate the canvas once per mount; the same CanvasTexture is
  // bound to the screen material so re-draws don't require a material swap.
  const bootCanvas = useMemo(() => {
    if (typeof document === "undefined") return null;
    const c = document.createElement("canvas");
    c.width = BOOT_CANVAS_WIDTH;
    c.height = BOOT_CANVAS_HEIGHT;
    return c;
  }, []);
  const bootTexture = useMemo(() => {
    if (!bootCanvas) return null;
    const tex = new CanvasTexture(bootCanvas);
    tex.colorSpace = SRGBColorSpace;
    tex.minFilter = LinearFilter;
    tex.magFilter = LinearFilter;
    tex.generateMipmaps = false;
    return tex;
  }, [bootCanvas]);
  const cursorVisibleRef = useRef(true);

  useImperativeHandle(
    ref,
    () => ({
      flashComplete: () => {
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
      cancelPress: () => {
        cancelTweenRef.current = gsap.to(pressedIntensityRef, {
          current: 0,
          duration: CANCEL_EASE_DURATION_S,
          ease: "power3.out",
        });
      },
    }),
    [],
  );

  // The press-start visual side-effect — fires when the parent's useHoldActivate
  // flips isHolding true. Spec says the LED snaps to full intensity on press
  // start, no easing.
  useEffect(() => {
    if (!isHolding) return;
    cancelTweenRef.current?.kill();
    pressedIntensityRef.current = LED_PRESSED_INTENSITY;
  }, [isHolding]);

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
        // for a controllable MeshStandardMaterial whose emissiveMap is our
        // boot-screen canvas — the rest of the system (pulse/states in #5,
        // boot glyphs in #7, dive in #10) only mutates emissiveIntensity.
        const screenMaterial = new MeshStandardMaterial({
          color: new Color("#000000"),
          emissive: new Color("#ffffff"),
          emissiveIntensity: 0,
          roughness: 0.25,
          metalness: 0,
          emissiveMap: bootTexture,
        });
        mesh.material = screenMaterial;
        screenMaterialRef.current = screenMaterial;
      }
    });

    return () => {
      screenMaterialRef.current?.dispose();
      screenMaterialRef.current = null;
    };
  }, [scene, bootTexture]);

  // Dispose the boot texture when the component unmounts.
  useEffect(() => {
    return () => {
      bootTexture?.dispose();
    };
  }, [bootTexture]);

  // Re-draw boot screen + drive screen emissive intensity on bootProgress
  // change. Drawing is cheap (~1ms for a 1024×512 canvas with 3 lines).
  useEffect(() => {
    if (!bootCanvas || !bootTexture) return;
    drawBootScreen(bootCanvas, {
      progress: bootProgress,
      showCursor: cursorVisibleRef.current,
    });
    bootTexture.needsUpdate = true;

    const screen = screenMaterialRef.current;
    if (!screen) return;
    // Don't fight GSAP — the complete-flash tween writes emissiveIntensity
    // for ~360ms and we'd otherwise clobber it. Once flash finishes the
    // tween settles to 0; if the dive (#10) has started, bootProgress > 0
    // pushes it back up.
    if (bootProgress > 0 && !gsap.isTweening(screen)) {
      screen.emissiveIntensity = SCREEN_ON_INTENSITY;
    }
  }, [bootCanvas, bootTexture, bootProgress]);

  // Blink the typing cursor while glyphs are mid-reveal. Pauses when the
  // boot screen is hidden (progress === 0) or fully revealed (progress >= 1).
  useEffect(() => {
    if (!bootCanvas || !bootTexture) return;
    if (bootProgress <= 0 || bootProgress >= 1) return;
    const interval = window.setInterval(() => {
      cursorVisibleRef.current = !cursorVisibleRef.current;
      drawBootScreen(bootCanvas, {
        progress: bootProgress,
        showCursor: cursorVisibleRef.current,
      });
      bootTexture.needsUpdate = true;
    }, CURSOR_BLINK_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [bootCanvas, bootTexture, bootProgress]);

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
    // (set on isHolding=true, eased back to 0 by GSAP on cancel/after complete fade).
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
});

export default Monitor;
