"use client";

import CardDeckBase from "./card-deck-base";

// Spec §3 — Yu-Gi-Oh deck mirrors the Pokémon position to the right and a bit
// back, with the opposite yaw so its fan opens rightward. The Y rotation
// difference vs. Pokémon (≈ 20°) is what stops the two decks reading as a
// staged pair.
const DESK_TOP_Y = -0.602;
const YUGIOH_POSITION: [number, number, number] = [0.08, DESK_TOP_Y, -0.14];
const YUGIOH_ROTATION_Y = -(8 * Math.PI) / 180;

export default function YugiohDeck() {
  return (
    <CardDeckBase
      position={YUGIOH_POSITION}
      rotation={[0, YUGIOH_ROTATION_Y, 0]}
      pulseTargetId="yugioh-deck"
      fanDirection={1}
      textures={{
        heroFront: "/lobby/textures/yugioh-front-mago-negro.webp",
        back: "/lobby/textures/yugioh-back.webp",
      }}
      enableHeroRise
    />
  );
}
