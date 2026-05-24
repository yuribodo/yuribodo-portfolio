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

// WillBourke's Nintendo DS (CC-BY 4.0). The model ships in OPEN pose with the
// lid leaning ~33° back from vertical. The lid mesh has no separate cover
// face wide enough to fold cleanly onto the base — closing it leaves the
// base's bottom screen exposed behind the lid. We keep the DS permanently
// open and use the click to flash the top-screen emissive instead.
// - Object_22 — floor plane that ships with the export; HIDE.
const HIDE_MESH_NAME = "Object_22";

// Spec §3 places the DS front-left of the desk. Pushed further left than spec
// to clear the keyboard and tuck under the MacBook's edge — reads as a
// portable parked next to the laptop rather than in front of the keyboard.
const DESK_TOP_Y = -0.602;
const DS_POSITION: [number, number, number] = [-0.65, DESK_TOP_Y, 0.18];
const DS_ROTATION_Y = (22 * Math.PI) / 180;

// Real DS Lite is 133mm wide closed. We size to 0.135m — sits between the
// MacBook (0.30m) and the figure cluster so it reads as a small portable.
const DS_TARGET_WIDTH = 0.135;

// Hover affordance — mirrors anime-figures so the desk reads as one
// consistent set of clickable objects.
const HOVER_LIFT_M = 0.012;
const HOVER_LERP_FACTOR = 0.18;
const HOVER_EMISSIVE_INTENSITY = 0.35;
const HOVER_EMISSIVE_COLOR = "#ffd9a8";
const HOVER_TRANSITION_S = 0.2;

// First-pointermove sweep glow.
const PULSE_INTENSITY = 1.5;
const PULSE_RISE_S = 0.15;
const PULSE_FALL_S = 0.25;

// Custom emissive plate overlaying the natural top-screen face. Sits on the
// lid's inner face in OPEN pose; its normal in the model's default OPEN
// pose is (0, +0.55, +0.84) — pointing up-and-forward toward the player.
const SCREEN_PLANE_WIDTH = 0.105;
const SCREEN_PLANE_HEIGHT = 0.052;
const SCREEN_LOCAL_Y = 0.041;
const SCREEN_LOCAL_Z = -0.054;
const SCREEN_LOCAL_X_ROT_RAD = -(33 * Math.PI) / 180;

// Click pulses the screen emissive — gives the DS something to do without
// any lid movement.
const SCREEN_PULSE_INTENSITY = 3;
const SCREEN_PULSE_UP_S = 0.18;
const SCREEN_PULSE_DOWN_S = 0.6;

interface NintendoDsProps {
  /** Fires when the screen emissive starts ramping on a click pulse. Lets
   *  the future audio system (#15) play a chime in sync. */
  onScreenOn?: () => void;
}

/** Imperative handle so the keyboard surrogate can fire the same animation
 *  as a click. */
export interface NintendoDsHandle {
  activate: () => void;
}

const NintendoDS = forwardRef<NintendoDsHandle, NintendoDsProps>(
  function NintendoDS({ onScreenOn }, ref) {
  const { scene } = useGLTF(LOBBY_MODELS.nintendoDs);
  const groupRef = useRef<Group>(null);
  const shellMaterialsRef = useRef<MeshStandardMaterial[]>([]);
  const screenMaterialRef = useRef<MeshStandardMaterial | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const isHoveredRef = useRef(false);

  const dsClone = useMemo(() => {
    const target = scene.clone(true);
    target.scale.setScalar(1);
    target.position.set(0, 0, 0);
    target.rotation.set(0, 0, 0);
    // Hide the floor plane FIRST so it doesn't dominate the size measurement.
    target.traverse((obj) => {
      const m = obj as Mesh;
      if (m.isMesh && m.name === HIDE_MESH_NAME) m.visible = false;
    });
    const sizedBox = new Box3().setFromObject(target);
    const sizedSize = new Vector3();
    sizedBox.getSize(sizedSize);
    const scale = DS_TARGET_WIDTH / Math.max(sizedSize.x, 0.0001);
    target.scale.setScalar(scale);

    const finalBox = new Box3().setFromObject(target);
    const finalCentre = new Vector3();
    finalBox.getCenter(finalCentre);
    target.position.set(-finalCentre.x, -finalBox.min.y, -finalCentre.z);

    return target;
  }, [scene]);

  useLayoutEffect(() => {
    // Clone materials per instance so emissive tweens don't leak across hot
    // reloads or sibling lobby objects. Keep the GLB's original side
    // (DoubleSide here) — forcing FrontSide culls the lid's cover face.
    const shellMaterials: MeshStandardMaterial[] = [];
    const tagShell = (mesh: Mesh) => {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const cloneMaterial = (mat: Material): Material => {
        const cloned = mat.clone();
        if (cloned instanceof MeshStandardMaterial) {
          if (
            cloned.emissive.r === 0 &&
            cloned.emissive.g === 0 &&
            cloned.emissive.b === 0
          ) {
            cloned.emissive = new Color(HOVER_EMISSIVE_COLOR);
            cloned.emissiveIntensity = 0;
            shellMaterials.push(cloned);
          }
        }
        return cloned;
      };
      const original = mesh.material;
      mesh.material = Array.isArray(original)
        ? original.map(cloneMaterial)
        : cloneMaterial(original);
    };
    dsClone.traverse((obj) => {
      const mesh = obj as Mesh;
      if (mesh.isMesh && mesh.visible) tagShell(mesh);
    });
    shellMaterialsRef.current = shellMaterials;

    return () => {
      shellMaterials.forEach((m) => m.dispose());
      shellMaterialsRef.current = [];
    };
  }, [dsClone]);

  // Frame-rate independent hover lift on the parent group.
  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;
    const targetY = DS_POSITION[1] + (isHovered ? HOVER_LIFT_M : 0);
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

  usePulseTarget("nintendo-ds", () => {
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
    const screen = screenMaterialRef.current;
    if (!screen) return;
    gsap.killTweensOf(screen, "emissiveIntensity");
    onScreenOn?.();
    gsap
      .timeline()
      .to(screen, {
        emissiveIntensity: SCREEN_PULSE_INTENSITY,
        duration: SCREEN_PULSE_UP_S,
        ease: "power2.out",
      })
      .to(screen, {
        emissiveIntensity: 0,
        duration: SCREEN_PULSE_DOWN_S,
        ease: "power2.in",
      });
  }, [onScreenOn]);

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
      position={DS_POSITION}
      rotation={[0, DS_ROTATION_Y, 0]}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      <primitive object={dsClone} />
      {/* Custom emissive plate flush with the lid's inner face (top screen).
          Click pulses it; otherwise it sits dark. */}
      <group
        position={[0, SCREEN_LOCAL_Y, SCREEN_LOCAL_Z]}
        rotation={[SCREEN_LOCAL_X_ROT_RAD, 0, 0]}
      >
        <mesh>
          <planeGeometry args={[SCREEN_PLANE_WIDTH, SCREEN_PLANE_HEIGHT]} />
          <meshStandardMaterial
            ref={(mat) => {
              if (mat) {
                mat.emissive = new Color("#0a140a");
                mat.emissiveIntensity = 0;
                screenMaterialRef.current = mat;
              }
            }}
            color="#020402"
            emissive="#0a140a"
            emissiveIntensity={0}
            roughness={0.4}
            metalness={0}
          />
        </mesh>
      </group>
    </group>
  );
});

export default NintendoDS;
