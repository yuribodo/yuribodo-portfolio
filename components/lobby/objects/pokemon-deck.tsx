"use client";

import CardDeckBase from "./card-deck-base";

// Spec §3 — TCG decks sit "front-centre, asymmetric, tossed not arranged".
// Pokémon deck slightly left of centre, slightly forward of the macbook, with
// a small CCW yaw so the fan opens leftward toward the player. Behind the
// keyboard (z=0.20) and ahead of the macbook (z=-0.10).
const DESK_TOP_Y = -0.602;
const POKEMON_POSITION: [number, number, number] = [-0.08, DESK_TOP_Y, -0.02];
const POKEMON_ROTATION_Y = (12 * Math.PI) / 180;

interface PokemonDeckProps {
  /** Fires on every fan / restack click. Forwarded to CardDeckBase. */
  onActivate?: () => void;
}

export default function PokemonDeck({ onActivate }: PokemonDeckProps) {
  return (
    <CardDeckBase
      position={POKEMON_POSITION}
      rotation={[0, POKEMON_ROTATION_Y, 0]}
      pulseTargetId="pokemon-deck"
      fanDirection={-1}
      textures={{
        heroFront: "/lobby/textures/pokemon-front-charizard.webp",
        back: "/lobby/textures/pokemon-back.webp",
      }}
      enableHoverIsolation
      onActivate={onActivate}
    />
  );
}
