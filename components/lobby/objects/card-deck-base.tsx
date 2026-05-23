"use client";

import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import gsap from "gsap";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  DoubleSide,
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
} from "three";
import type { ThreeEvent } from "@react-three/fiber";
import type { Group, Texture } from "three";

import { usePulseTarget } from "@/hooks/use-pulse-target";

// Real TCG card dimensions in metres: 63mm × 88mm.
const CARD_WIDTH = 0.063;
const CARD_HEIGHT = 0.088;
// 0.3mm gap between stacked planes — enough to defeat z-fighting at the desk
// camera distance without reading as visible separation.
const CARD_PLANE_GAP = 0.0003;
// 57 cards × 0.3mm ≈ 17mm, padded to 18mm so the visible bulk reads like a
// chunky draw pile rather than a single sheet of cardboard.
const BULK_HEIGHT = 0.018;

// Top-3 stack Y positions (deck-local; origin sits on the desk surface).
const BULK_CENTER_Y = BULK_HEIGHT / 2;
const CARD_2_Y = BULK_HEIGHT + CARD_PLANE_GAP;
const CARD_1_Y = CARD_2_Y + CARD_PLANE_GAP;
const CARD_0_Y = CARD_1_Y + CARD_PLANE_GAP;

// Hover affordance — matches every other lobby object so the desk reads as
// one consistent set of clickable items.
const HOVER_LIFT_M = 0.012;
const HOVER_LERP_FACTOR = 0.18;
const HOVER_EMISSIVE_COLOR = "#ffd9a8";

// First-pointermove discovery sweep (issue #14, part B).
const PULSE_INTENSITY = 1.5;
const PULSE_RISE_S = 0.15;
const PULSE_FALL_S = 0.25;

// Fan-out tween. Spec §5: cards rotate +10/+20/+30°, lift ~0.05u, ~400ms each.
const FAN_LIFT_M = 0.05;
const FAN_ANGLE_PER_CARD_DEG = 10;
const FAN_DUR_S = 0.4;
const FAN_STAGGER_S = 0.06;
const FAN_EASE = "power2.out";
const RESTACK_DUR_S = 0.6;
const RESTACK_EASE = "power3.inOut";

// Yu-Gi-Oh hero card: small additional lift above the fan baseline. The spec
// originally called for +0.30u + infinite Y-spin; in practice that reads as
// the card floating off into space, plus the spin reads goofy / mall-kiosk
// the longer you watch it. A modest lift keeps the hero card visibly
// distinct without leaving the desk.
const HERO_RISE_M = 0.03;
const HERO_RISE_DUR_S = 0.45;

// Pokémon per-card hover isolation: lifts further and yaws toward the camera.
// Non-isolated cards dim via opacity.
const ISOLATE_EXTRA_LIFT_M = 0.05;
const ISOLATE_YAW_DEG = 20;
const ISOLATE_DUR_S = 0.25;
const ISOLATE_EASE = "power2.out";
const DIM_OPACITY = 0.85;

const DEG = Math.PI / 180;

export interface DeckTextures {
  /** Hero card front, shown face-up on all three top cards. Real card scan. */
  heroFront: string;
  /** Card back, used on the bulk's top face (the deck-pile reading). */
  back: string;
}

export interface CardDeckProps {
  position: [number, number, number];
  rotation: [number, number, number];
  /** Pulse-registry id (issue #14). Stable for the component's lifetime. */
  pulseTargetId: string;
  /** -1 fans the top 3 cards to the −X local side, +1 to +X. Pivot sits on
   *  the opposite edge so the card swings toward the camera as it opens. */
  fanDirection: -1 | 1;
  textures: DeckTextures;
  /** Pokémon variant: hover a fanned card to isolate it forward. */
  enableHoverIsolation?: boolean;
  /** Yu-Gi-Oh variant: hero (card 0) sits a touch higher than the other two
   *  fanned cards so the deck has a clear focal point. The original spec
   *  called for a +0.30u rise + infinite spin; in scene that read as the
   *  card drifting off the desk, so this is now a modest static lift only. */
  enableHeroRise?: boolean;
  /** Hook for future audio (#15). Fires on every fan toggle click. */
  onActivate?: () => void;
}

export default function CardDeckBase({
  position,
  rotation,
  pulseTargetId,
  fanDirection,
  textures,
  enableHoverIsolation = false,
  enableHeroRise = false,
  onActivate,
}: CardDeckProps) {
  const groupRef = useRef<Group>(null);
  const cardPivotRefs = useRef<Array<Group | null>>([null, null, null]);
  const cardMaterialsRef = useRef<Array<MeshStandardMaterial | null>>([
    null,
    null,
    null,
  ]);
  const isFannedRef = useRef(false);
  const isHoveredRef = useRef(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isolatedIndex, setIsolatedIndex] = useState<number | null>(null);

  const [frontMap, backMap] = useTexture([
    textures.heroFront,
    textures.back,
  ]) as Texture[];

  // Loose-image textures default to LinearSRGB which renders the colour
  // channels through the linear pipeline AND through an inverse-gamma at
  // output — net effect is the texture reads as a washed-out / overexposed
  // version of the original. Forcing SRGBColorSpace tells three.js the
  // source pixels are already gamma-encoded so the output stays faithful to
  // the scan.
  useLayoutEffect(() => {
    [frontMap, backMap].forEach((tex) => {
      if (!tex) return;
      tex.colorSpace = SRGBColorSpace;
      tex.wrapS = tex.wrapT = RepeatWrapping;
      tex.anisotropy = 8;
      tex.needsUpdate = true;
    });
  }, [frontMap, backMap]);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;
    const targetY = position[1] + (isHovered ? HOVER_LIFT_M : 0);
    const t = 1 - Math.pow(1 - HOVER_LERP_FACTOR, delta * 60);
    group.position.y += (targetY - group.position.y) * t;
  });

  // Mirror hover state to the ref so the pulse-target callback can read it
  // without going through the React render cycle. No emissive boost on hover
  // — the warm glow washes out the card art and makes the hero unreadable.
  // The deck-wide position lift on the outer group is affordance enough.
  useLayoutEffect(() => {
    isHoveredRef.current = isHovered;
  }, [isHovered]);

  usePulseTarget(pulseTargetId, () => {
    const materials = cardMaterialsRef.current.filter(
      (m): m is MeshStandardMaterial => m !== null,
    );
    if (materials.length === 0) return;
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
          emissiveIntensity: 0,
          duration: PULSE_FALL_S,
          ease: "power2.in",
        });
    });
  });

  // Run the fan-open or restack tween. Always kills in-flight tweens on the
  // exact same targets first so rapid clicks mid-animation snap cleanly to
  // the new destination instead of fighting.
  const animateFan = useCallback(
    (toFanned: boolean) => {
      const pivots = cardPivotRefs.current;
      const duration = toFanned ? FAN_DUR_S : RESTACK_DUR_S;
      const ease = toFanned ? FAN_EASE : RESTACK_EASE;

      pivots.forEach((pivot, i) => {
        if (!pivot) return;
        gsap.killTweensOf(pivot.position);
        gsap.killTweensOf(pivot.rotation);

        const angleDeg = (i + 1) * FAN_ANGLE_PER_CARD_DEG;
        const targetRotY = toFanned ? fanDirection * angleDeg * DEG : 0;
        const isHero = i === 0;
        const heroExtra =
          enableHeroRise && toFanned && isHero ? HERO_RISE_M : 0;
        const targetY = toFanned ? FAN_LIFT_M + heroExtra : 0;
        const stagger = toFanned ? i * FAN_STAGGER_S : 0;
        const posDur =
          toFanned && isHero && enableHeroRise ? HERO_RISE_DUR_S : duration;

        gsap.to(pivot.rotation, {
          y: targetRotY,
          duration,
          ease,
          delay: stagger,
        });
        gsap.to(pivot.position, {
          y: targetY,
          duration: posDur,
          ease,
          delay: stagger,
        });
      });
    },
    [fanDirection, enableHeroRise],
  );

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      const next = !isFannedRef.current;
      isFannedRef.current = next;
      onActivate?.();
      if (!next) setIsolatedIndex(null);
      animateFan(next);
    },
    [animateFan, onActivate],
  );

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setIsHovered(true);
    document.body.style.cursor = "pointer";
  };
  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setIsHovered(false);
    setIsolatedIndex(null);
    document.body.style.cursor = "";
  };

  // Per-card hover for the Pokémon variant. Doesn't stopPropagation so the
  // outer group's hover affordance still fires; the two states (deck-wide
  // glow + per-card isolation) coexist.
  const handleCardOver = (i: number) => () => {
    if (!enableHoverIsolation || !isFannedRef.current) return;
    setIsolatedIndex(i);
  };
  const handleCardOut = (i: number) => () => {
    if (!enableHoverIsolation || !isFannedRef.current) return;
    setIsolatedIndex((current) => (current === i ? null : current));
  };

  // Apply isolation tweens whenever isolatedIndex changes. Only runs in the
  // fanned state — restack uses its own tween via animateFan.
  useEffect(() => {
    if (!enableHoverIsolation) return;
    if (!isFannedRef.current) return;
    const pivots = cardPivotRefs.current;
    pivots.forEach((pivot, i) => {
      if (!pivot) return;
      const isIsolated = isolatedIndex === i;
      const fanAngleDeg = (i + 1) * FAN_ANGLE_PER_CARD_DEG;
      const baseFanY = fanDirection * fanAngleDeg * DEG;
      gsap.to(pivot.position, {
        y: FAN_LIFT_M + (isIsolated ? ISOLATE_EXTRA_LIFT_M : 0),
        duration: ISOLATE_DUR_S,
        ease: ISOLATE_EASE,
        overwrite: "auto",
      });
      gsap.to(pivot.rotation, {
        y: isIsolated
          ? baseFanY - fanDirection * ISOLATE_YAW_DEG * DEG
          : baseFanY,
        duration: ISOLATE_DUR_S,
        ease: ISOLATE_EASE,
        overwrite: "auto",
      });
      const mat = cardMaterialsRef.current[i];
      if (mat) {
        gsap.to(mat, {
          opacity: isolatedIndex === null || isIsolated ? 1 : DIM_OPACITY,
          duration: ISOLATE_DUR_S,
          ease: ISOLATE_EASE,
          overwrite: "auto",
        });
      }
    });
  }, [isolatedIndex, fanDirection, enableHoverIsolation]);

  const cardYs = useMemo<[number, number, number]>(
    () => [CARD_0_Y, CARD_1_Y, CARD_2_Y],
    [],
  );

  // Pivot sits at -fanDirection * W/2 from the deck centre; the card mesh
  // inside the pivot is offset by +fanDirection * W/2 so it returns to the
  // deck centre when fan rotation is 0 (stacked state).
  const pivotOffsetX = -(CARD_WIDTH / 2) * fanDirection;
  const cardMeshOffsetX = (CARD_WIDTH / 2) * fanDirection;

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={rotation}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {/* Bulk = the 57 abstracted cards below the top 3. Cream edges read
          as paper; the top face wears the deck's card back so the fanned
          state reveals "more cards below" instead of a blank surface. */}
      <mesh position={[0, BULK_CENTER_Y, 0]} castShadow receiveShadow>
        <boxGeometry args={[CARD_WIDTH, BULK_HEIGHT, CARD_HEIGHT]} />
        <meshStandardMaterial
          attach="material-0"
          color="#f4ecd8"
          roughness={0.7}
        />
        <meshStandardMaterial
          attach="material-1"
          color="#f4ecd8"
          roughness={0.7}
        />
        <meshStandardMaterial
          attach="material-2"
          map={backMap}
          color="#aaaaaa"
          roughness={0.65}
          metalness={0.05}
          envMapIntensity={0.3}
        />
        <meshStandardMaterial
          attach="material-3"
          color="#f4ecd8"
          roughness={0.7}
        />
        <meshStandardMaterial
          attach="material-4"
          color="#f4ecd8"
          roughness={0.7}
        />
        <meshStandardMaterial
          attach="material-5"
          color="#f4ecd8"
          roughness={0.7}
        />
      </mesh>

      {[0, 1, 2].map((i) => (
        <group
          key={i}
          ref={(node) => {
            cardPivotRefs.current[i] = node;
          }}
          position={[pivotOffsetX, cardYs[i], 0]}
          onPointerOver={handleCardOver(i)}
          onPointerOut={handleCardOut(i)}
        >
          <mesh
            position={[cardMeshOffsetX, 0, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            castShadow
            receiveShadow
          >
            <planeGeometry args={[CARD_WIDTH, CARD_HEIGHT]} />
            <meshStandardMaterial
              ref={(mat) => {
                if (mat) {
                  cardMaterialsRef.current[i] = mat;
                  // Preset the emissive channel so the discovery-sweep pulse
                  // (which writes to emissiveIntensity) lands on the right
                  // colour. Idle hover does NOT touch emissive — it would
                  // wash out the card art.
                  mat.emissive.set(HOVER_EMISSIVE_COLOR);
                  mat.emissiveIntensity = 0;
                }
              }}
              map={frontMap}
              // Mid-grey baseline counteracts the warm key + desk lamp
              // (intensities 4 + 6 in desk-environment) — without this
              // the bright Charizard/Mago Negro pixels blow out and the
              // art reads as a pale wash. Pair with low envMapIntensity
              // so the warehouse IBL doesn't add a second highlight.
              color="#aaaaaa"
              roughness={0.6}
              metalness={0.05}
              envMapIntensity={0.3}
              side={DoubleSide}
              transparent
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}
