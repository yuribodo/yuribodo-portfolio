"use client";

import dynamic from "next/dynamic";
import { lobbyAssetUrl } from "@/lib/lobby/asset-url";
import { preload } from "react-dom";
import { LOBBY_MODELS } from "@/lib/lobby/asset-manifest";
import { TERRAIN_DATA_URL } from "@/lib/lobby/terrain-data-manifest";
import { useEffect, useState } from "react";
import { getLobbyBlockReason, type LobbyBlockReason } from "@/lib/lobby/gpu-detect";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useLobbyVisited } from "@/hooks/use-lobby-visited";
import { LobbyLoading } from "./lobby-loading";
import { useLobbyState } from "./use-lobby-state";

const DeskScene = dynamic(() => import("./desk-scene"), {
  ssr: false,
  loading: () => <LobbyLoading />,
});

export function LobbyGate() {
  const reducedMotion = useReducedMotion();
  const { markVisited } = useLobbyVisited();
  const [state, dispatch] = useLobbyState();
  // Tri-state so we never flash the lobby for a frame on weak devices while
  // probing. null = probing, reason = blocked (portfolio directly), false = go.
  const [blocked, setBlocked] = useState<LobbyBlockReason | false | null>(null);

  useEffect(() => {
    // One-shot probe of device signals + WebGL renderer. Setting state in an
    // effect is appropriate here: the values live in browser APIs, not React,
    // and this single read on mount gates the heavy 3D bundle from loading.
    // A lazy useState initializer would run during SSR where `window` is undefined.
    const reason = getLobbyBlockReason();
    if (reason) {
      // Surfaced as info (not warn) so it shows in normal devtools without
      // dirtying the console for end users.
      console.info(`[lobby] skipped: ${reason}`);
    } else {
      for (const url of [LOBBY_MODELS.desk, LOBBY_MODELS.monitor, TERRAIN_DATA_URL]) {
        preload(lobbyAssetUrl(url), { as: "fetch", crossOrigin: "anonymous" });
      }
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBlocked(reason ?? false);
  }, []);

  useEffect(() => {
    if (state === "done") markVisited();
  }, [state, markVisited]);

  const blocksPage = !reducedMotion && state !== "done" && !blocked;
  useEffect(() => {
    if (!blocksPage) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [blocksPage]);

  if (state === "done") return null;
  // Keep server and hydration markup identical while browser capabilities resolve.
  if (blocked === null) return <LobbyLoading />;
  if (blocked || reducedMotion) return null;

  return <DeskScene state={state} dispatch={dispatch} />;
}
