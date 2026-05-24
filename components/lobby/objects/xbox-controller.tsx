"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import gsap from "gsap";
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Box3, Color, MeshStandardMaterial, Vector3 } from "three";
import type { ThreeEvent } from "@react-three/fiber";
import type { Group, Material, Mesh } from "three";

import { usePulseTarget } from "@/hooks/use-pulse-target";
import { LOBBY_MODELS } from "@/lib/lobby/assets";

// BatonyRobson's Xbox One S Controller (CC-BY 4.0, Sketchfab). Every face
// button + the Xbox home button ships as its own named mesh — perfect for
// per-button emissive without touching the body. The `_XBox_Gamepad_by_
// Batony_Robson_0` suffix comes from Sketchfab's export; three.js's
// GLTFLoader rewrites spaces in glTF node names to underscores, so the
// prefixes below match the runtime names rather than the raw GLB names.
const MESH_PREFIX = {
  xbox: "XboxButton",
  a: "A_Button",
  b: "B_Button",
  x: "X_Button",
  y: "Y_Button",
} as const;
type ButtonKey = keyof typeof MESH_PREFIX;

// Mirror layout of the DS: DS sits front-left at [-0.65, …, 0.18]; we place
// the controller front-right with a slight inward Y rotation pointing toward
// the camera.
const DESK_TOP_Y = -0.602;
const XBOX_POSITION: [number, number, number] = [0.55, DESK_TOP_Y, 0.2];
const XBOX_ROTATION_Y = -(20 * Math.PI) / 180;

// Real Xbox controller is ~150mm wide. We sit it between the MacBook (0.30m)
// and the DS (0.135m) so it reads as the same scale family.
const XBOX_TARGET_WIDTH = 0.16;

// Hover affordance — matches nintendo-ds.tsx and anime-figures so the desk
// reads as one consistent set of clickable objects.
const HOVER_LIFT_M = 0.012;
const HOVER_LERP_FACTOR = 0.18;
const HOVER_EMISSIVE_INTENSITY = 0.35;
const HOVER_EMISSIVE_COLOR = "#ffd9a8";
const HOVER_TRANSITION_S = 0.2;

// First-pointermove sweep glow (issue #14, part B).
const PULSE_INTENSITY = 1.5;
const PULSE_RISE_S = 0.15;
const PULSE_FALL_S = 0.25;

// Click cascade — vibration shake on x/z, ~200ms total.
const SHAKE_AMPLITUDE_X_M = 0.005;
const SHAKE_AMPLITUDE_Z_M = 0.003;
const SHAKE_HALF_PERIOD_S = 0.04;
const SHAKE_YOYO_REPEATS = 4;

// Xbox home button: green ramp 200ms / hold 800ms / down 400ms (spec §3).
const XBOX_LED_COLOR = "#00b34a";
const XBOX_LED_PEAK = 4;
const XBOX_LED_UP_S = 0.2;
const XBOX_LED_HOLD_S = 0.8;
const XBOX_LED_DOWN_S = 0.4;

// Face buttons: peak then fade, sequential.
const FACE_BUTTON_PEAK = 3;
const FACE_BUTTON_UP_S = 0.12;
const FACE_BUTTON_DOWN_S = 0.32;
const FACE_BUTTON_STAGGER_S = 0.1;

// Canonical Xbox face-button colors (per issue spec). Slightly muted vs.
// pure brand hues so the cluster doesn't read as cartoonish.
const FACE_BUTTONS: ReadonlyArray<{ key: ButtonKey; color: string }> = [
  { key: "a", color: "#0e7a0d" }, // green
  { key: "b", color: "#c8102e" }, // red
  { key: "x", color: "#0d4d92" }, // blue
  { key: "y", color: "#f2a900" }, // yellow
];

interface XboxControllerProps {
  /** Fires when the click cascade starts. Hook for future audio (#15). */
  onActivate?: () => void;
}

/** Imperative handle so the keyboard surrogate can fire the same vibration
 *  cascade as a click. */
export interface XboxControllerHandle {
  activate: () => void;
}

const XboxController = forwardRef<XboxControllerHandle, XboxControllerProps>(
  function XboxController({ onActivate }, ref) {
  const { scene } = useGLTF(LOBBY_MODELS.xboxController);
  const groupRef = useRef<Group>(null);
  // Inner group absorbs the click shake so it doesn't fight the hover-lift
  // tween on the outer group's y.
  const shakeGroupRef = useRef<Group>(null);
  const shellMaterialsRef = useRef<MeshStandardMaterial[]>([]);
  const buttonMaterialsRef = useRef<Record<ButtonKey, MeshStandardMaterial | null>>({
    xbox: null,
    a: null,
    b: null,
    x: null,
    y: null,
  });
  const [isHovered, setIsHovered] = useState(false);
  const isHoveredRef = useRef(false);

  const xboxClone = useMemo(() => {
    const target = scene.clone(true);
    target.scale.setScalar(1);
    target.position.set(0, 0, 0);
    target.rotation.set(0, 0, 0);
    const sizedBox = new Box3().setFromObject(target);
    const sizedSize = new Vector3();
    sizedBox.getSize(sizedSize);
    const scale = XBOX_TARGET_WIDTH / Math.max(sizedSize.x, 0.0001);
    target.scale.setScalar(scale);
    // Re-centre on x/z and bottom-align on y so the controller sits flush
    // with the desk top regardless of the source pivot.
    const finalBox = new Box3().setFromObject(target);
    const finalCentre = new Vector3();
    finalBox.getCenter(finalCentre);
    target.position.set(-finalCentre.x, -finalBox.min.y, -finalCentre.z);
    return target;
  }, [scene]);

  useLayoutEffect(() => {
    const shellMaterials: MeshStandardMaterial[] = [];
    const buttonMaterials: Record<ButtonKey, MeshStandardMaterial | null> = {
      xbox: null,
      a: null,
      b: null,
      x: null,
      y: null,
    };

    // The source material is exported with alphaMode: BLEND and a sparse
    // emissive texture. We force opaque (controller is solid plastic) and
    // null out the emissive map so emissive colour + intensity drive
    // glow directly instead of being multiplied to zero by a black texel.
    const cloneMaterial = (mat: Material): Material => {
      const cloned = mat.clone();
      if (cloned instanceof MeshStandardMaterial) {
        cloned.transparent = false;
        cloned.depthWrite = true;
        cloned.emissiveMap = null;
        cloned.emissive = new Color(HOVER_EMISSIVE_COLOR);
        cloned.emissiveIntensity = 0;
      }
      return cloned;
    };

    const findButtonKey = (name: string): ButtonKey | null => {
      for (const [key, prefix] of Object.entries(MESH_PREFIX) as [
        ButtonKey,
        string,
      ][]) {
        if (name.startsWith(prefix)) return key;
      }
      return null;
    };

    const buttonColor = (key: ButtonKey): string => {
      if (key === "xbox") return XBOX_LED_COLOR;
      return FACE_BUTTONS.find((b) => b.key === key)?.color ?? HOVER_EMISSIVE_COLOR;
    };

    xboxClone.traverse((obj) => {
      const mesh = obj as Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const original = mesh.material;
      const cloned = Array.isArray(original)
        ? original.map(cloneMaterial)
        : cloneMaterial(original);
      mesh.material = cloned;
      const std = (Array.isArray(cloned) ? cloned[0] : cloned) as Material;
      if (!(std instanceof MeshStandardMaterial)) return;

      const btn = findButtonKey(mesh.name);
      if (btn) {
        std.emissive = new Color(buttonColor(btn));
        std.emissiveIntensity = 0;
        buttonMaterials[btn] = std;
      } else {
        // Body, triggers, bumpers, sticks, d-pad — collected for the warm
        // hover glow + first-move pulse sweep.
        shellMaterials.push(std);
      }
    });

    shellMaterialsRef.current = shellMaterials;
    buttonMaterialsRef.current = buttonMaterials;

    return () => {
      shellMaterials.forEach((m) => m.dispose());
      (Object.values(buttonMaterials) as Array<MeshStandardMaterial | null>).forEach(
        (m) => m?.dispose(),
      );
      shellMaterialsRef.current = [];
      buttonMaterialsRef.current = {
        xbox: null,
        a: null,
        b: null,
        x: null,
        y: null,
      };
    };
  }, [xboxClone]);

  // Frame-rate independent hover lift on the outer group.
  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;
    const targetY = XBOX_POSITION[1] + (isHovered ? HOVER_LIFT_M : 0);
    const t = 1 - Math.pow(1 - HOVER_LERP_FACTOR, delta * 60);
    group.position.y += (targetY - group.position.y) * t;
  });

  useLayoutEffect(() => {
    isHoveredRef.current = isHovered;
    const materials = shellMaterialsRef.current;
    const target = isHovered ? HOVER_EMISSIVE_INTENSITY : 0;
    materials.forEach((mat) => {
      gsap.to(mat, {
        emissiveIntensity: target,
        duration: HOVER_TRANSITION_S,
        ease: "power2.out",
        overwrite: "auto",
      });
    });
  }, [isHovered]);

  usePulseTarget("xbox-controller", () => {
    const materials = shellMaterialsRef.current;
    if (materials.length === 0) return;
    const resting = isHoveredRef.current ? HOVER_EMISSIVE_INTENSITY : 0;
    materials.forEach((mat) => {
      gsap.killTweensOf(mat, "emissiveIntensity");
      gsap
        .timeline()
        .to(mat, {
          emissiveIntensity: PULSE_INTENSITY,
          duration: PULSE_RISE_S,
          ease: "power2.out",
        })
        .to(mat, {
          emissiveIntensity: resting,
          duration: PULSE_FALL_S,
          ease: "power2.in",
        });
    });
  });

  const activate = useCallback(() => {
      onActivate?.();

      // Vibration: brief offset shake on the inner group so the hover
      // lift on the outer group keeps animating untouched. Reset to origin
      // before starting so rapid clicks don't drift.
      const shakeGroup = shakeGroupRef.current;
      if (shakeGroup) {
        gsap.killTweensOf(shakeGroup.position);
        shakeGroup.position.set(0, 0, 0);
        gsap.to(shakeGroup.position, {
          x: SHAKE_AMPLITUDE_X_M,
          z: SHAKE_AMPLITUDE_Z_M,
          duration: SHAKE_HALF_PERIOD_S,
          yoyo: true,
          repeat: SHAKE_YOYO_REPEATS,
          ease: "power1.inOut",
          onComplete: () => {
            shakeGroup.position.set(0, 0, 0);
          },
        });
      }

      // Xbox home button green ramp/hold/fall.
      const xboxBtn = buttonMaterialsRef.current.xbox;
      if (xboxBtn) {
        gsap.killTweensOf(xboxBtn, "emissiveIntensity");
        gsap
          .timeline()
          .to(xboxBtn, {
            emissiveIntensity: XBOX_LED_PEAK,
            duration: XBOX_LED_UP_S,
            ease: "power2.out",
          })
          .to(xboxBtn, {
            emissiveIntensity: XBOX_LED_PEAK,
            duration: XBOX_LED_HOLD_S,
          })
          .to(xboxBtn, {
            emissiveIntensity: 0,
            duration: XBOX_LED_DOWN_S,
            ease: "power2.in",
          });
      }

      // Face buttons cascade A → B → X → Y, 100ms stagger.
      FACE_BUTTONS.forEach(({ key }, i) => {
        const mat = buttonMaterialsRef.current[key];
        if (!mat) return;
        gsap.killTweensOf(mat, "emissiveIntensity");
        gsap
          .timeline({ delay: i * FACE_BUTTON_STAGGER_S })
          .to(mat, {
            emissiveIntensity: FACE_BUTTON_PEAK,
            duration: FACE_BUTTON_UP_S,
            ease: "power2.out",
          })
          .to(mat, {
            emissiveIntensity: 0,
            duration: FACE_BUTTON_DOWN_S,
            ease: "power2.in",
          });
      });
    }, [onActivate]);

  useImperativeHandle(ref, () => ({ activate }), [activate]);

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      activate();
    },
    [activate],
  );

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setIsHovered(true);
    document.body.style.cursor = "pointer";
  };
  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setIsHovered(false);
    document.body.style.cursor = "";
  };

  return (
    <group
      ref={groupRef}
      position={XBOX_POSITION}
      rotation={[0, XBOX_ROTATION_Y, 0]}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      <group ref={shakeGroupRef}>
        <primitive object={xboxClone} />
      </group>
    </group>
  );
});

export default XboxController;
