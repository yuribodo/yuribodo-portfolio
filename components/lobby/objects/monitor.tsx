"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
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
import type {
  Mesh,
  MeshStandardMaterial as MeshStandardMaterialType,
  Object3D,
} from "three";

import { LOBBY_MODELS } from "@/lib/lobby/assets";
import {
  SCREEN_CANVAS_HEIGHT,
  SCREEN_CANVAS_WIDTH,
  paintScreen,
  type ScreenMode,
} from "@/lib/lobby/screen-paint";
import type { LobbyState } from "../use-lobby-state";

// Annelida MateView exports at ~0.72m wide including the stand foot. At the
// seated POV (#5), 0.62m read too imposing relative to the hutch opening, so
// we ease back to 0.54m — still believable as a 24-27" panel, but framed by
// the hutch rather than crowding it.
const MONITOR_TARGET_WIDTH = 0.54;
// The seanb desk model has a raised monitor riser at the back of the writing
// surface. Both values probed empirically from the desk mesh; keep in sync
// if the desk's normalisation in desk.tsx ever changes.
const MONITOR_RISER_TOP_Y = -0.533;
const MONITOR_RISER_CENTER_Z = -0.28;
// Annelida's Screen_Display_0 mesh — a 4-vert quad with the Display material
// (emissiveTexture only). We swap the material at mount so the emissive map
// + intensity can be driven from React state.
const SCREEN_MESH_NAME = "Screen_Display_0";

// Click flash on enter — short white spike, then back to the resting emissive
// level. The glitch beat (driven via triggerGlitch) runs on top of the flash.
const SCREEN_FLASH_INTENSITY = 6;
const SCREEN_FLASH_RISE_S = 0.06;
const SCREEN_FLASH_FALL_S = 0.3;

// Resting emissive intensity. The screen carries Hero-matching content
// (dithered "YURI BODO"), so the emissive lifts the texture into "lit
// monitor" range without blowing it out under the warm key + rim lights.
const SCREEN_ON_INTENSITY = 2.2;

// Glitch beat duration triggered on click. 200ms = enough to register as
// "channel change disturbance", short enough to not delay the dive.
const GLITCH_DURATION_MS = 200;

// Throttle the canvas repaint. Full-frame Bayer dither at 1024x512 is the
// expensive bit (~6ms on a decent CPU). 30fps is indistinguishable from
// 60fps at this distance and halves the per-second cost.
const REPAINT_INTERVAL_MS = 1000 / 30;

export interface MonitorProps {
  /** Fired when the user clicks the screen mesh. Parent dispatches the
   *  ENTER_CLICKED action and may trigger flashComplete + glitch. */
  onEnter: () => void;
  /** Drives screen content (idle vs diving) and gates hover/click. */
  state: LobbyState;
  /** Dive progress in [0, 1]. Tightens the dither during the dolly so the
   *  preview "resolves" right before handoff. The transition timeline
   *  drives this; default 0 keeps idle look. */
  diveProgress?: number;
}

export interface MonitorHandle {
  /** Fired by the parent on ENTER_CLICKED: plays the click flash and
   *  starts the 200ms channel-change glitch on the screen content. */
  flashComplete: () => void;
  /** Returns the live screen mesh so the dive transition (#10) can
   *  measure its world-space box for the FOV-fill camera-Z math. */
  getScreenMesh: () => Mesh | null;
  /** Tween-friendly handle on the emissive intensity so the transition
   *  can do the t=1.60s "last bloom" beat without forking another ref. */
  getScreenMaterial: () => MeshStandardMaterialType | null;
}

function pickMode(state: LobbyState, glitchActive: boolean): ScreenMode {
  if (glitchActive) return "glitch";
  if (state === "booting") return "diving";
  return "idle";
}

const Monitor = forwardRef<MonitorHandle, MonitorProps>(function Monitor(
  { onEnter, state, diveProgress = 0 },
  ref,
) {
  const { scene } = useGLTF(LOBBY_MODELS.monitor);
  const screenMaterialRef = useRef<MeshStandardMaterialType | null>(null);
  const screenMeshRef = useRef<Mesh | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Glitch state lives in a ref so the useFrame loop can read it without
  // re-rendering the component every tick.
  const glitchUntilRef = useRef(0);
  const lastPaintRef = useRef(0);
  // Mirror props in refs so the useFrame closure stays stable but always
  // sees the latest state / diveProgress from the parent.
  const stateRef = useRef(state);
  const diveProgressRef = useRef(diveProgress);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  useEffect(() => {
    diveProgressRef.current = diveProgress;
  }, [diveProgress]);

  const screenCanvas = useMemo(() => {
    if (typeof document === "undefined") return null;
    const c = document.createElement("canvas");
    c.width = SCREEN_CANVAS_WIDTH;
    c.height = SCREEN_CANVAS_HEIGHT;
    return c;
  }, []);
  const screenTexture = useMemo(() => {
    if (!screenCanvas) return null;
    const tex = new CanvasTexture(screenCanvas);
    tex.colorSpace = SRGBColorSpace;
    tex.minFilter = LinearFilter;
    tex.magFilter = LinearFilter;
    tex.generateMipmaps = false;
    return tex;
  }, [screenCanvas]);

  useImperativeHandle(
    ref,
    () => ({
      flashComplete: () => {
        const screen = screenMaterialRef.current;
        if (!screen) return;
        gsap.killTweensOf(screen);
        gsap
          .timeline()
          .to(screen, {
            emissiveIntensity: SCREEN_FLASH_INTENSITY,
            duration: SCREEN_FLASH_RISE_S,
            ease: "none",
          })
          .to(screen, {
            emissiveIntensity: SCREEN_ON_INTENSITY,
            duration: SCREEN_FLASH_FALL_S,
            ease: "power2.out",
          });
        glitchUntilRef.current = performance.now() + GLITCH_DURATION_MS;
      },
      getScreenMesh: () => screenMeshRef.current,
      getScreenMaterial: () => screenMaterialRef.current,
    }),
    [],
  );

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
        const screenMaterial = new MeshStandardMaterial({
          color: new Color("#000000"),
          emissive: new Color("#ffffff"),
          emissiveIntensity: state === "loading" ? 0 : SCREEN_ON_INTENSITY,
          roughness: 0.25,
          metalness: 0,
          emissiveMap: screenTexture,
        });
        mesh.material = screenMaterial;
        screenMaterialRef.current = screenMaterial;
        screenMeshRef.current = mesh;
      }
    });

    return () => {
      screenMaterialRef.current?.dispose();
      screenMaterialRef.current = null;
      screenMeshRef.current = null;
    };
    // `state` only matters for the initial emissive level — we don't want
    // to rebuild the material when it changes (the useFrame manages it).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, screenTexture]);

  useEffect(() => {
    return () => {
      screenTexture?.dispose();
    };
  }, [screenTexture]);

  // Resting emissive level follows the lobby state — off while loading,
  // lit otherwise. The GSAP flash + transition bloom tween write directly
  // to this material so we don't fight them here.
  useEffect(() => {
    const screen = screenMaterialRef.current;
    if (!screen) return;
    if (gsap.isTweening(screen)) return;
    screen.emissiveIntensity = state === "loading" ? 0 : SCREEN_ON_INTENSITY;
  }, [state]);

  // Single continuous paint loop. Reads stateRef / diveProgressRef /
  // glitchUntilRef so the closure never goes stale and the cost stays at
  // one paint per ~33ms regardless of how often React re-renders.
  useFrame(() => {
    if (!screenCanvas || !screenTexture) return;
    if (stateRef.current === "loading") return;

    const now = performance.now();
    if (now - lastPaintRef.current < REPAINT_INTERVAL_MS) return;
    lastPaintRef.current = now;

    const glitchRemaining = glitchUntilRef.current - now;
    const glitchActive = glitchRemaining > 0;
    const glitchIntensity = glitchActive
      ? glitchRemaining / GLITCH_DURATION_MS
      : 0;

    paintScreen(screenCanvas, {
      mode: pickMode(stateRef.current, glitchActive),
      progress: diveProgressRef.current,
      time: now,
      glitchIntensity,
    });
    screenTexture.needsUpdate = true;
  });

  const isInteractive = state === "idle" || state === "exploring";

  useEffect(() => {
    if (!isHovered || !isInteractive) return;
    const previous = document.body.style.cursor;
    document.body.style.cursor = "pointer";
    return () => {
      document.body.style.cursor = previous;
    };
  }, [isHovered, isInteractive]);

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    if (!isInteractive) return;
    if (e.object !== screenMeshRef.current) return;
    e.stopPropagation();
    setIsHovered(true);
  };
  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    if (e.object !== screenMeshRef.current) return;
    e.stopPropagation();
    setIsHovered(false);
  };
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (!isInteractive) return;
    if (e.object !== screenMeshRef.current) return;
    e.stopPropagation();
    onEnter();
  };

  return (
    <primitive
      object={scene}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    />
  );
});

export default Monitor;
