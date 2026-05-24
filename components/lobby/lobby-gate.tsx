"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { isGpuCapable } from "@/lib/lobby/gpu-detect";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useLobbyVisited } from "@/hooks/use-lobby-visited";
import { LobbyLoading } from "./lobby-loading";
import { useLobbyState } from "./use-lobby-state";

const DeskScene = dynamic(() => import("./desk-scene"), {
  ssr: false,
  loading: () => <LobbyLoading />,
});

interface LobbyGateProps {
  isMobile: boolean;
}

export function LobbyGate({ isMobile }: LobbyGateProps) {
  const reducedMotion = useReducedMotion();
  const { markVisited } = useLobbyVisited();
  const [state, dispatch] = useLobbyState();
  // Tri-state so we never flash the lobby for a frame on slow GPUs while
  // probing. null = probing, false = blocked, true = good to render.
  const [gpuCapable, setGpuCapable] = useState<boolean | null>(null);

  useEffect(() => {
    // One-shot probe of the WebGL renderer string. Setting state in an
    // effect is appropriate here: the value lives in a browser API, not
    // React, and there's no subscription mechanism to "GPU capability
    // changed" — it's a single read on mount that gates the heavy 3D
    // bundle from loading. The alternative (lazy useState initializer)
    // would run during SSR where `window` is undefined.
    const capable = isGpuCapable();
    if (!capable) {
      // Surfaced as info (not warn) so it shows in normal devtools without
      // dirtying the console for end users.
      console.info("[lobby] skipped due to GPU capability");
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGpuCapable(capable);
  }, []);

  useEffect(() => {
    if (state === "done") markVisited();
  }, [state, markVisited]);

  if (isMobile || reducedMotion) return null;
  if (state === "done") return null;
  // null = probing — render nothing so the lobby doesn't briefly appear
  // before the blocklist check completes. false = blocklisted GPU.
  if (gpuCapable !== true) return null;

  return <DeskScene state={state} dispatch={dispatch} />;
}
