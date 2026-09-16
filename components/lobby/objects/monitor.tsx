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

// A soft confirmation pulse responds immediately without a white flash.
const SCREEN_FLASH_INTENSITY = 2.8;
const SCREEN_FLASH_RISE_S = 0.06;
const SCREEN_FLASH_FALL_S = 0.16;

// Resting emissive intensity. The screen carries Hero-matching content
// (dithered "YURI BODO"), so the emissive lifts the texture into "lit
// monitor" range without blowing it out under the warm key + rim lights.
const SCREEN_ON_INTENSITY = 2.2;

// Throttle the canvas repaint. Full-frame Bayer dither at 1024x512 is the
// expensive bit (~6ms on a decent CPU). 30fps is indistinguishable from
// 60fps at this distance and halves the per-second cost.
const REPAINT_INTERVAL_MS = 1000 / 30;

export interface MonitorProps {
  /** Fired when the user clicks the screen mesh. */
  onEnter: () => void;
  /** Drives screen content (idle vs diving) and gates hover/click. */
  state: LobbyState;
  /** Animate the preview once the desk is ready. */
  livePaint?: boolean;
}

export interface MonitorHandle {
  /** Soft screen pulse confirming entry. */
  pulseScreen: () => void;
  /** Update texture progress without re-rendering the React scene. */
  setDiveProgress: (progress: number) => void;
  /** Live screen bounds for the camera approach. */
  getScreenMesh: () => Mesh | null;
  /** Emissive intensity for the transition lighting. */
  getScreenMaterial: () => MeshStandardMaterialType | null;
}

const Monitor = forwardRef<MonitorHandle, MonitorProps>(function Monitor(
  { onEnter, state, livePaint = false },
  ref,
) {
  const { scene } = useGLTF(LOBBY_MODELS.monitor);
  const screenMaterialRef = useRef<MeshStandardMaterialType | null>(null);
  const screenMeshRef = useRef<Mesh | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  const lastPaintRef = useRef(0);
  const stateRef = useRef(state);
  const diveProgressRef = useRef(0);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

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
      pulseScreen: () => {
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
      },
      setDiveProgress: (progress) => { diveProgressRef.current = progress; },
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
        // Always start dark — the boot-up effect (in the state useEffect
        // below) tweens to the resting intensity on loading → idle, so the
        // screen "powers on" rather than appearing already-lit.
        const screenMaterial = new MeshStandardMaterial({
          color: new Color("#000000"),
          emissive: new Color("#ffffff"),
          emissiveIntensity: 0,
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
      if (screenMaterialRef.current) gsap.killTweensOf(screenMaterialRef.current);
      screenMaterialRef.current?.dispose();
      screenMaterialRef.current = null;
      screenMeshRef.current = null;
    };
  }, [scene, screenTexture]);

  useEffect(() => {
    return () => {
      screenTexture?.dispose();
    };
  }, [screenTexture]);

  // State changes must not overwrite an active confirmation or dive tween.
  useEffect(() => {
    const screen = screenMaterialRef.current;
    if (!screen) return;
    if (gsap.isTweening(screen)) return;
    screen.emissiveIntensity = state === "loading" ? 0 : SCREEN_ON_INTENSITY;
  }, [state]);

  // Mirror livePaint in a ref so the useFrame closure stays stable.
  const livePaintRef = useRef(livePaint);
  useEffect(() => {
    livePaintRef.current = livePaint;
  }, [livePaint]);

  // One-shot paint so the screen has visible content the moment lights
  // come up — even before the live paint loop activates. Re-runs on state
  // change so the visual matches (idle ↔ booting) without waiting for
  // livePaint to flip.
  useEffect(() => {
    if (!screenCanvas || !screenTexture) return;
    if (state === "loading") return;
    paintScreen(screenCanvas, {
      mode: state === "booting" ? "diving" : "idle",
      progress: diveProgressRef.current,
      time: performance.now(),
    });
    // eslint-disable-next-line react-hooks/immutability
    screenTexture.needsUpdate = true;
  }, [screenCanvas, screenTexture, state]);

  // All animated paints share one throttle, including dive progress.
  // Keeping progress in a ref avoids a second paint from a React effect.
  useFrame(() => {
    if (!screenCanvas || !screenTexture) return;
    if (stateRef.current === "loading") return;
    if (!livePaintRef.current && stateRef.current !== "booting") return;

    const now = performance.now();
    if (now - lastPaintRef.current < REPAINT_INTERVAL_MS) return;
    lastPaintRef.current = now;

    paintScreen(screenCanvas, {
      mode: stateRef.current === "booting" ? "diving" : "idle",
      progress: diveProgressRef.current,
      time: now,
    });
    // Three.js requires this mutation to push the new canvas frame to the
    // GPU — not a React anti-pattern.
    // eslint-disable-next-line react-hooks/immutability
    screenTexture.needsUpdate = true;
  });

  const isInteractive = state === "idle" || state === "exploring";

  // Flip a data attribute on the lobby container so globals.css can switch
  // to cursor:pointer without losing the !important guard that keeps stray
  // DOM cursors out of the rest of the lobby surface.
  useEffect(() => {
    if (!isHovered || !isInteractive) return;
    const lobbyEl = document.querySelector<HTMLElement>('[data-lobby-active="true"]');
    if (!lobbyEl) return;
    lobbyEl.dataset.lobbyCursor = "pointer";
    return () => {
      delete lobbyEl.dataset.lobbyCursor;
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
