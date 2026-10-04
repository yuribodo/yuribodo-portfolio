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
  MeshStandardMaterial,
  Vector3,
} from "three";
import type {
  Mesh,
  MeshStandardMaterial as MeshStandardMaterialType,
  Object3D,
} from "three";

import { LOBBY_MODELS } from "@/lib/lobby/assets";
import {
  GRADIENT_TIME_SCALE,
  SCREEN_CANVAS_HEIGHT,
  SCREEN_CANVAS_WIDTH,
  SCREEN_FRAGMENT,
  SUBTITLE_FONT,
  TITLE_FONT,
  ditherStrengthFor,
  paintScreenText,
  textAlphaFor,
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

function createTextTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = SCREEN_CANVAS_WIDTH;
  canvas.height = SCREEN_CANVAS_HEIGHT;
  const texture = new CanvasTexture(canvas);
  texture.premultiplyAlpha = true;
  texture.anisotropy = 4;
  return texture;
}

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

  const stateRef = useRef(state);
  const diveProgressRef = useRef(0);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const screen = useMemo(() => {
    if (typeof document === "undefined") return null;
    const title = createTextTexture(), subtitle = createTextTexture();
    const uniforms = {
      screenTime: { value: 0 },
      screenDither: { value: ditherStrengthFor("idle", 0) },
      screenTextAlpha: { value: 1 },
      screenSubtitle: { value: subtitle },
    };
    return {
      title, subtitle, uniforms,
      paintText: () => {
        paintScreenText(title.image, subtitle.image);
        title.needsUpdate = subtitle.needsUpdate = true;
      },
      update: (mode: "idle" | "diving", progress: number, animate: boolean) => {
        uniforms.screenDither.value = ditherStrengthFor(mode, progress);
        uniforms.screenTextAlpha.value = textAlphaFor(mode, progress);
        if (animate) uniforms.screenTime.value = performance.now() * GRADIENT_TIME_SCALE;
      },
      dispose: () => { title.dispose(); subtitle.dispose(); },
    };
  }, []);

  useEffect(() => {
    if (!screen) return;
    let cancelled = false;
    screen.paintText();
    // Painted once, so repaint when the web font actually arrives.
    Promise.all([document.fonts.load(TITLE_FONT), document.fonts.load(SUBTITLE_FONT)])
      .then(() => { if (!cancelled) screen.paintText(); }, () => {});
    return () => {
      cancelled = true;
      screen.dispose();
    };
  }, [screen]);

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
          emissiveMap: screen?.title ?? null,
        });
        if (screen) {
          screenMaterial.userData.preloadTextures = [screen.subtitle];
          screenMaterial.onBeforeCompile = (shader) => {
            Object.assign(shader.uniforms, screen.uniforms);
            shader.fragmentShader = shader.fragmentShader
              .replace("#include <common>", "#include <common>\nuniform sampler2D screenSubtitle;\nuniform float screenTime, screenDither, screenTextAlpha;")
              .replace("#include <emissivemap_fragment>", SCREEN_FRAGMENT);
          };
          screenMaterial.customProgramCacheKey = () => "monitor-screen-v2";
        }
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
  }, [scene, screen]);

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

  // Uniforms only; the shader repaints the screen every frame for free.
  useFrame(() => {
    if (!screen || stateRef.current === "loading") return;
    const diving = stateRef.current === "booting";
    screen.update(diving ? "diving" : "idle", diveProgressRef.current, diving || livePaintRef.current);
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
