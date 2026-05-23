"use client";

import { useGLTF } from "@react-three/drei";
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

import { LOBBY_MODELS } from "@/lib/lobby/assets";
import {
  BOOT_CANVAS_HEIGHT,
  BOOT_CANVAS_WIDTH,
  drawBootScreen,
  type BootScreenMode,
} from "@/lib/lobby/boot-screen";
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

// Screen flash on enter — same timeline as the old hold-complete flash.
const SCREEN_FLASH_INTENSITY = 6;
const SCREEN_FLASH_RISE_S = 0.06;
const SCREEN_FLASH_FALL_S = 0.3;

// Screen emissive intensity in lit (ready/executing) states. Higher values
// blow out under our dramatic key + rim lighting; 2.5 reads as a real CRT.
const SCREEN_ON_INTENSITY = 2.5;
// Cursor blink frequency — 2.5Hz feels like a real CRT.
const CURSOR_BLINK_INTERVAL_MS = 400;

export interface MonitorProps {
  /** Fired when the user clicks the screen mesh. Parent dispatches the
   *  ENTER_CLICKED action and may trigger flashComplete. */
  onEnter: () => void;
  /** Drives screen content (ready vs executing) and gates hover/click. */
  state: LobbyState;
  /** Executing-mode reveal progress in [0, 1]. The dive transition (#10)
   *  animates this; 0 keeps the executing lines blank. */
  bootProgress?: number;
}

export interface MonitorHandle {
  /** Called by the parent on ENTER_CLICKED to play the click flash. */
  flashComplete: () => void;
}

function pickMode(state: LobbyState): BootScreenMode {
  return state === "idle" || state === "exploring" ? "ready" : "executing";
}

const Monitor = forwardRef<MonitorHandle, MonitorProps>(function Monitor(
  { onEnter, state, bootProgress = 0 },
  ref,
) {
  const { scene } = useGLTF(LOBBY_MODELS.monitor);
  const screenMaterialRef = useRef<MeshStandardMaterialType | null>(null);
  const screenMeshRef = useRef<Mesh | null>(null);
  const [isHovered, setIsHovered] = useState(false);

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
        // Swap the shipped Display material for a controllable emissive that
        // we can drive (ready prompt, executing reveal, flash on click).
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
        screenMeshRef.current = mesh;
      }
    });

    return () => {
      screenMaterialRef.current?.dispose();
      screenMaterialRef.current = null;
      screenMeshRef.current = null;
    };
  }, [scene, bootTexture]);

  // Dispose the boot texture when the component unmounts.
  useEffect(() => {
    return () => {
      bootTexture?.dispose();
    };
  }, [bootTexture]);

  // Draw the appropriate screen contents based on lobby state.
  //   - loading:           screen off (intensity 0, no draw)
  //   - idle / exploring:  ready prompt
  //   - booting:           executing reveal (driven by bootProgress)
  //   - done:              n/a, lobby unmounts
  useEffect(() => {
    if (!bootCanvas || !bootTexture) return;
    const screen = screenMaterialRef.current;
    if (!screen) return;

    if (state === "loading") {
      screen.emissiveIntensity = 0;
      return;
    }

    drawBootScreen(bootCanvas, {
      mode: pickMode(state),
      progress: bootProgress,
      showCursor: cursorVisibleRef.current,
    });
    bootTexture.needsUpdate = true;

    // Don't fight the flashComplete GSAP tween — it transiently writes
    // emissiveIntensity for ~360ms and we'd otherwise clobber it.
    if (!gsap.isTweening(screen)) {
      screen.emissiveIntensity = SCREEN_ON_INTENSITY;
    }
  }, [bootCanvas, bootTexture, state, bootProgress]);

  // Cursor blink. Runs whenever the cursor would be visually meaningful:
  //   - ready mode: the prompt cursor at the end of "./enter"
  //   - executing mode mid-reveal: the typing-line trailing block
  useEffect(() => {
    if (!bootCanvas || !bootTexture) return;
    const isReady = state === "idle" || state === "exploring";
    const isTyping =
      state === "booting" && bootProgress > 0 && bootProgress < 1;
    if (!isReady && !isTyping) return;

    const interval = window.setInterval(() => {
      cursorVisibleRef.current = !cursorVisibleRef.current;
      drawBootScreen(bootCanvas, {
        mode: pickMode(state),
        progress: bootProgress,
        showCursor: cursorVisibleRef.current,
      });
      bootTexture.needsUpdate = true;
    }, CURSOR_BLINK_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [bootCanvas, bootTexture, state, bootProgress]);

  // Cursor pointer while hovering the screen mesh.
  useEffect(() => {
    if (!isHovered) return;
    const previous = document.body.style.cursor;
    document.body.style.cursor = "pointer";
    return () => {
      document.body.style.cursor = previous;
    };
  }, [isHovered]);

  const isInteractive = state === "idle" || state === "exploring";

  // R3F bubbles pointer events from any child mesh up to the <primitive>
  // wrapper. We filter to the screen mesh so the bezel/stand stay inert,
  // and to the actionable states so clicks during boot/loading are no-ops.
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
